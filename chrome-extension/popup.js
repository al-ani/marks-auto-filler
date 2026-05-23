let csvData = [];
let parsedRows = [];
let columnHeaders = [];

const csvFileInput = document.getElementById('csvFile');
const fillButton = document.getElementById('fillButton');
const idColumnSelect = document.getElementById('idColumn');
const scoreColumnSelect = document.getElementById('scoreColumn');
const reasonCodeSection = document.getElementById('reasonCodeSection');
const columnMappingSection = document.getElementById('columnMappingSection');
const scoreMappingSection = document.getElementById('scoreMappingSection');

csvFileInput.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const fileName = document.getElementById('fileName');
    fileName.textContent = '📄 ' + file.name;
    fileName.style.display = 'block';
    
    const reader = new FileReader();
    reader.onload = function(event) {
      const text = event.target.result;
      parseCSV(text);
    };
    reader.readAsText(file);
  }
});

idColumnSelect.addEventListener('change', rebuildCsvData);
scoreColumnSelect.addEventListener('change', rebuildCsvData);

function parseCSV(text) {
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  if (!normalizedText) {
    resetLoadedFileState();
    showStatus('The selected file is empty', 'error');
    return;
  }

  const lines = normalizedText.split('\n').filter(line => line.trim());
  const separator = detectSeparator(lines);
  const headerParts = splitLine(lines[0], separator);

  if (headerParts.length < 2) {
    resetLoadedFileState();
    showStatus('The file must contain at least two columns', 'error');
    return;
  }

  columnHeaders = headerParts.map((header, index) => {
    const cleanedHeader = header.trim();
    return cleanedHeader || `Column ${index + 1}`;
  });

  parsedRows = lines.slice(1).map(line => splitLine(line, separator));
  populateColumnSelectors();
  rebuildCsvData();
}

function detectSeparator(lines) {
  const firstLine = lines[0] || '';
  return firstLine.includes(';') ? ';' : ',';
}

function splitLine(line, separator) {
  return line.split(separator).map(part => part.trim());
}

function populateColumnSelectors() {
  idColumnSelect.innerHTML = '';
  scoreColumnSelect.innerHTML = '';

  columnHeaders.forEach((header, index) => {
    const idOption = document.createElement('option');
    idOption.value = index;
    idOption.textContent = `${index + 1}. ${header}`;
    idColumnSelect.appendChild(idOption);

    const scoreOption = document.createElement('option');
    scoreOption.value = index;
    scoreOption.textContent = `${index + 1}. ${header}`;
    scoreColumnSelect.appendChild(scoreOption);
  });

  idColumnSelect.value = String(findPreferredColumnIndex(['id', 'student id', 'studentid', 'sid'], 0));
  scoreColumnSelect.value = String(findPreferredColumnIndex(['score', 'mark', 'marks', 'grade'], Math.min(1, columnHeaders.length - 1)));
}

function findPreferredColumnIndex(candidates, fallbackIndex) {
  const foundIndex = columnHeaders.findIndex(header => candidates.includes(header.toLowerCase()));
  return foundIndex >= 0 ? foundIndex : fallbackIndex;
}

function rebuildCsvData() {
  const idIndex = Number(idColumnSelect.value);
  const scoreIndex = Number(scoreColumnSelect.value);

  csvData = parsedRows.reduce((items, row) => {
    const id = (row[idIndex] || '').trim();
    const score = (row[scoreIndex] || '').trim();

    if (id && score) {
      items.push({ id, score });
    }

    return items;
  }, []);

  const hasData = csvData.length > 0;
  fillButton.disabled = !hasData;
  columnMappingSection.classList.remove('hidden');
  scoreMappingSection.classList.remove('hidden');
  reasonCodeSection.classList.remove('hidden');

  if (hasData) {
    showStatus(`Loaded ${csvData.length} student records`, 'success');
    showPreview();
    return;
  }

  document.getElementById('preview').style.display = 'none';
  showStatus('No valid rows found for the selected ID and score columns', 'error');
}

function resetLoadedFileState() {
  csvData = [];
  parsedRows = [];
  columnHeaders = [];
  fillButton.disabled = true;
  columnMappingSection.classList.add('hidden');
  scoreMappingSection.classList.add('hidden');
  reasonCodeSection.classList.add('hidden');
  document.getElementById('preview').style.display = 'none';
}

function showPreview() {
  const preview = document.getElementById('preview');
  const tbody = document.querySelector('#previewTable tbody');
  tbody.innerHTML = '';
  
  // Show first 10 rows
  const previewData = csvData.slice(0, 10);
  previewData.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${row.id}</td><td>${row.score}</td>`;
    tbody.appendChild(tr);
  });
  
  preview.style.display = 'block';
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = type;
  status.style.display = 'block';
}

fillButton.addEventListener('click', async function() {
  if (csvData.length === 0) {
    showStatus('Please select a CSV file first', 'error');
    return;
  }

  const reasonCode = document.getElementById('reasonCode').value;
  
  showStatus('Filling scores...', 'info');
  
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Inject the script to fill scores
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fillScores,
      args: [csvData, reasonCode]
    });
    
    const result = results[0].result;
    
    if (result.success) {
      showStatus(
        `Filled ${result.filled} scores and updated ${result.updatedReasons} reason fields. ${result.notFound} students not found on page.`,
        'success'
      );
    } else {
      showStatus('❌ Error: ' + result.error, 'error');
    }
  } catch (error) {
    showStatus('❌ Error: ' + error.message, 'error');
  }
});

// This function will be injected into the page
function fillScores(data, reasonCode) {
  try {
    let filled = 0;
    let notFound = 0;
    let updatedReasons = 0;
    
    // Get all table rows
    const rows = document.querySelectorAll('tr');
    
    // Create a map of student ID to score for quick lookup
    const scoreMap = new Map();
    data.forEach(item => {
      scoreMap.set(item.id.toString(), item.score.toString());
    });
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td.ntdefault');
      
      if (cells.length >= 2) {
        // The student ID is typically in the second column (index 1)
        const studentIdCell = cells[1];
        const studentId = studentIdCell ? studentIdCell.textContent.trim() : '';
        
        if (scoreMap.has(studentId)) {
          // Find the score input field in this row
          const scoreInput = row.querySelector('input[name="marks_tab"]');
          
          if (scoreInput) {
            scoreInput.value = scoreMap.get(studentId);
            
            // Trigger input event to ensure any form validation is triggered
            scoreInput.dispatchEvent(new Event('input', { bubbles: true }));
            scoreInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            filled++;
          }
        }
      }
    });

    const reasonSelects = document.querySelectorAll('select[name="grdchgCde_tab"]');
    reasonSelects.forEach(select => {
      if ([...select.options].some(option => option.value === reasonCode)) {
        select.value = reasonCode;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        updatedReasons++;
      }
    });
    
    // Count how many from CSV were not found
    notFound = data.length - filled;
    
    return { success: true, filled, notFound, updatedReasons };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
