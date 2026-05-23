# Student Score Filler Chrome Extension

A Chrome extension that automatically fills student scores from a CSV file into a web form.

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right corner)
3. Click **Load unpacked**
4. Select the `chrome-extension` folder

## Usage

1. Navigate to the page with the student score form
2. Click the extension icon in Chrome toolbar
3. Click **Select CSV File** and choose your CSV file
4. After the file loads, choose which file column contains the student ID and which column contains the score
5. Review the preview to make sure data loaded correctly
6. Choose the reason code that should be applied to all students
7. Click **Fill Scores** to automatically fill in the scores and update all reason dropdowns

## CSV File Format

The CSV file should have the following format:

```csv
id,score
202303552,85.71
202302918,73.81
202300957,74.76
```

- First column: Student ID
- Second column: Score
- First row is treated as header and skipped
- If your file uses different column positions, you can choose the correct ID and score columns in the popup after uploading the file

## How It Works

The extension:
1. Reads the CSV file you select
2. Shows the reason-code and column-mapping controls only after a file is loaded
3. Lets you choose which uploaded columns contain the student ID and score
4. Looks for table rows on the page with student IDs in the second column
5. Matches student IDs from the CSV with IDs on the page
6. Fills the corresponding score input field (`<input name="marks_tab">`)
7. Sets every reason dropdown (`<select name="grdchgCde_tab">`) to the selected value

## Troubleshooting

- Make sure your CSV file has the correct format (id,score)
- Ensure you're on the correct page with the student form
- The extension looks for student IDs in the second `<td class="ntdefault">` cell of each row
