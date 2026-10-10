# Test cases

General test instructions

- each test is started by loading the app
- after each test step, take a screenshot
- language of the user is English, unless a test explicitly says the browser locale is German (de-DE)
- the app starts with the bundled PAM.json (1554 entries) and an empty OwnProducts.json; no file has been uploaded unless a test says so explicitly (see section 5)
- the app has no backend/persistence; navigate between pages via the UI, not via a page reload, unless a test explicitly says to reload
- start URL: <http://localhost:8080/index.html> (via `npm start`)
- use a consistent browser and window size for all screenshots
- entry counts for the relative maintenance filters (1.10, 1.11) depend on the current date and may need to be re-verified over time
- the support-end state shown on specific products (6.5) also depends on the current date and may need to be re-verified over time

## Tests per view

| Test | App shell | Main | MyProducts | MyProductsAdd | SupportStatus | ProductDetail |
| --- | --- | --- | --- | --- | --- | --- |
| [1 - Homepage](#test-1) | x | x | | | | |
| [1.1 - Start app](#test-1-1) | | x | | | | |
| [1.2 - Load table data](#test-1-2) | | x | | | | |
| [1.3 - Search](#test-1-3) | | x | | | | |
| [1.4 - Sort table rows](#test-1-4) | | x | | | | |
| [1.5 - Sort table rows ascending](#test-1-5) | | x | | | | |
| [1.6 - Sort table, reset](#test-1-6) | | x | | | | |
| [1.7 - Add column](#test-1-7) | | x | | | | |
| [1.8 - Show additional filters](#test-1-8) | | x | | | | |
| [1.9 - Hide additional filters](#test-1-9) | | x | | | | |
| [1.10 - Filter by maintenance end date](#test-1-10) | | x | | | | |
| [1.11 - Filter and mark support end date](#test-1-11) | | x | | | | |
| [1.12 - Full reset](#test-1-12) | | x | | | | |
| [1.13 - Chart analysis dialog](#test-1-13) | | x | | | | |
| [1.14 - Filter by product line and "Reset filters"](#test-1-14) | | x | | | | |
| [1.15 - Sort by mainstream maintenance date](#test-1-15) | | x | | | | |
| [1.16 - Start app on tablet](#test-1-16) | | x | | | | |
| [1.17 - Start app on phone](#test-1-17) | | x | | | | |
| [2 - Support status](#test-2) | | | | | x | |
| [2.1 - Own products shown on support status](#test-2-1) | | | x | | x | |
| [2.2 - Search on support status](#test-2-2) | | | x | | x | |
| [2.3 - Filter by current status](#test-2-3) | | | x | | x | |
| [2.4 - Filter by product line and "Reset filters"](#test-2-4) | | | x | | x | |
| [2.5 - Sort by mainstream maintenance date](#test-2-5) | | | x | | x | |
| [2.6 - Filter by maintenance end date and mark support end date](#test-2-6) | | | x | | x | |
| [2.7 - Full reset](#test-2-7) | | | x | | x | |
| [2.8 - Chart analysis dialog](#test-2-8) | | | x | | x | |
| [3 - My products](#test-3) | | | x | | | |
| [3.1 - Add products](#test-3-1) | | | x | | | |
| [3.2 - Add products and list them in the table](#test-3-2) | | | x | | | |
| [3.3 - Add and remove a product](#test-3-3) | | | x | | | |
| [3.4 - Navigate away without saving](#test-3-4) | | | x | | x | |
| [3.5 - "My products" scope filter with no own products](#test-3-5) | | | x | | | |
| [4 - Create own product](#test-4) | | | x | x | | |
| [4.1 - Add a new product](#test-4-1) | | | x | x | x | |
| [4.2 - Required fields missing](#test-4-2) | | | x | x | | |
| [4.3 - Add a new product with all fields filled in](#test-4-3) | | | x | x | x | |
| [5.1 - Upload PAM.json (valid)](#test-5-1) | x | | | | | |
| [5.2 - Upload PAM.json (invalid)](#test-5-2) | x | | | | | |
| [5.3 - Upload OwnProducts.json (app toolbar)](#test-5-3) | x | | | | | |
| [5.4 - Upload OwnProducts.json (invalid)](#test-5-4) | x | | x | | | |
| [5.5 - Download own products](#test-5-5) | | | x | | | |
| [6.1 - Show product detail](#test-6-1) | | x | | | | x |
| [6.2 - Toggle own product from the product detail page](#test-6-2) | | | x | | x | x |
| [6.3 - Show product detail with German locale](#test-6-3) | | x | | | | x |
| [6.4 - Open support portal](#test-6-4) | | x | | | | x |
| [6.5 - Support status icon reflects approaching end of mainstream maintenance](#test-6-5) | | x | | | | x |

<a id="test-1"></a>

## 1 - Homepage

Given the user navigates to index.html in the browser
Then the page title is "Support Validation app"

<a id="test-1-1"></a>

### 1.1 - Start app

Given the user starts the app
When the table of entries has loaded
Then the table shows 1554 entries

<a id="test-1-2"></a>

### 1.2 - Load table data

Given the user starts the app
When the table of entries has loaded
And the user scrolls down
Then the table loads more entries

<a id="test-1-3"></a>

### 1.3 - Search

Given the table shows 1554 entries
When the user searches for "HANA" in the table search field
Then 305 entries are shown
And the first entry is product version "ABAP FND 1709 ON HANA"
When the user clears the search field
Then the table shows 1554 entries again

<a id="test-1-4"></a>

### 1.4 - Sort table rows

Given the table has loaded
When the user sorts the table
And selects "Current Status"
Then the first entries shown have current status "In customer-specific maintenance"
And the first entry is "SAP NETWEAVER 7.4"

<a id="test-1-5"></a>

### 1.5 - Sort table rows ascending

Given the table has loaded
When the user sorts the table
And selects "Current Status"
And clicks "Descending"
Then the first entries shown have current status "Unrestricted available"
And the first entry is "SAP S/4HANA 2025"

<a id="test-1-6"></a>

### 1.6 - Sort table, reset

Given the table has loaded
When the user sorts the table
And selects "Official Name"
Then the first entry in the table is "SAP DATA SERVICES 2027"
When the user clicks the reset icon in the sort dialog
Then the first entry in the table is "ABAP FND 1709 ON HANA"

<a id="test-1-7"></a>

### 1.7 - Add column

Given the table has 9 columns
When the user clicks the column settings button
And selects "URL to SAP Support portal"
And closes the dialog
Then a new column "SAP Support portal" is shown
And the table has 10 columns

<a id="test-1-8"></a>

### 1.8 - Show additional filters

Given the filter bar shows 4 filters
When the user clicks "More filters"
Then 9 filters are shown

<a id="test-1-9"></a>

### 1.9 - Hide additional filters

Given the filter bar shows 4 filters
When the user clicks "More filters"
Then 9 filters are shown
When the user clicks "Hide filters"
Then 4 filters are shown

<a id="test-1-10"></a>

### 1.10 - Filter by maintenance end date

Given the table shows 1554 entries
When the user selects "In 3 Months" from the "Mainstream Maintenance" filter
Then the table shows 143 entries
And the first entry is "ACCNTSUBSTAUTOM_ADV 7.38.0"

<a id="test-1-11"></a>

### 1.11 - Filter and mark support end date

Given the table shows 1554 entries
When the user selects "In 6 Months" from the "Mainstream Maintenance" filter
Then the table shows 154 entries
And the first entry is "ACCNTSUBSTAUTOM_ADV 7.38.0"
When the user selects "3 months" from "Mark entries"
Then the first 10 entries are marked in red
And entry "FIONEER VAM 1.0" is not marked red

<a id="test-1-12"></a>

### 1.12 - Full reset

Given the user has entered a search term, set at least one filter and changed the sort order
When the user clicks the "Reset" button in the toolbar
Then the search field is empty
And all filters are reset
And the sort order is back to the default (version, ascending)

<a id="test-1-13"></a>

### 1.13 - Chart analysis dialog

Given the table has loaded
When the user clicks the "Chart analysis" button
Then a dialog opens showing a bar chart of the currently filtered entries by status
When the user closes the dialog
Then the table is unchanged

<a id="test-1-14"></a>

### 1.14 - Filter by product line and "Reset filters"

Given the table shows 1554 entries
When the user clicks "More filters"
And filters by product line "S/4HANA"
Then only matching entries are shown
When the user clicks "Reset filters"
Then the product line filter is cleared and the table shows 1554 entries again

<a id="test-1-15"></a>

### 1.15 - Sort by mainstream maintenance date

Given the table shows 1554 entries
When the user sorts the table and selects "End of Mainstream Maintenance"
Then the table is sorted by mainstream maintenance date, ascending
When the user clicks "Descending"
Then the first entry changes to reflect the reversed sort order

<a id="test-1-16"></a>

### 1.16 - Start app on tablet

Given the user starts the app on a tablet
Then the table of entries has loaded

<a id="test-1-17"></a>

### 1.17 - Start app on phone

Given the user starts the app on a phone
Then the table of entries has loaded

<a id="test-2"></a>

## 2 - Support status

Given the user has not selected any own products
When the user navigates to the supportstatus page
Then the page shows the message "no products maintained"

<a id="test-2-1"></a>

### 2.1 - Own products shown on support status

Given the user has added the products "SAP NETWEAVER 7.5", "SAP NETWEAVER 7.4", "SAP S/4HANA 2021", "SAP S/4HANA 2022", "SAP S/4HANA 2025" on the myproducts page
When the user navigates to the supportstatus page
Then the table shows 5 entries
And the message "no products maintained" is not shown

<a id="test-2-2"></a>

### 2.2 - Search on support status

Given the support status table shows the user's 5 own products (see 2.1)
When the user searches for "HANA" in the table search field
Then only the matching own products are shown
When the user clears the search field
Then the table shows 5 entries again

<a id="test-2-3"></a>

### 2.3 - Filter by current status

Given the support status table shows the user's 5 own products (see 2.1)
When the user notes the first row's current status
And selects that status from the "Current Status" filter
Then only own products with that status are shown

<a id="test-2-4"></a>

### 2.4 - Filter by product line and "Reset filters"

Given the support status table shows the user's 5 own products (see 2.1)
When the user clicks "More filters"
And filters by product line "S/4HANA"
Then only the matching own products are shown
When the user clicks "Reset filters"
Then the product line filter is cleared and all 5 own products are shown again

<a id="test-2-5"></a>

### 2.5 - Sort by mainstream maintenance date

Given the support status table shows the user's 5 own products (see 2.1)
When the user sorts the table and selects "End of Mainstream Maintenance"
Then the table is sorted by mainstream maintenance date, ascending
When the user clicks "Descending"
Then the first entry changes to reflect the reversed sort order

<a id="test-2-6"></a>

### 2.6 - Filter by maintenance end date and mark support end date

Given the support status table shows the user's 5 own products (see 2.1)
When the user selects "In 6 Months" from the "Mainstream Maintenance" filter
Then only own products ending within 6 months are shown
When the user selects "3 months" from "Mark entries"
Then rows are marked according to how soon their mainstream maintenance ends

<a id="test-2-7"></a>

### 2.7 - Full reset

Given the support status table shows the user's 5 own products (see 2.1)
And the user has entered a search term, set a filter and changed the sort order
When the user clicks the "Reset" button in the toolbar
Then the search field is empty
And the sort order is back to the default (version, ascending)
And the table still shows the user's 5 own products

<a id="test-2-8"></a>

### 2.8 - Chart analysis dialog

Given the support status table shows the user's 5 own products (see 2.1)
When the user clicks the "Chart analysis" button
Then a dialog opens showing a bar chart of the own products by status
When the user closes the dialog
Then the table is unchanged

<a id="test-3"></a>

## 3 - My products

Given the user navigates to the myproducts page
Then the table shows "PAM-Products (0/1554)"
When the user selects the 2nd entry in the table
And clicks "Add"
Then the table shows "PAM-Products (1/1554)"

<a id="test-3-1"></a>

### 3.1 - Add products

Given the user navigates to the myproducts page
When the user adds the products "SAP NETWEAVER 7.5", "SAP NETWEAVER 7.4", "SAP S/4HANA 2021", "SAP S/4HANA 2022", "SAP S/4HANA 2025"
Then the table shows "PAM-Products (5/1554)"

<a id="test-3-2"></a>

### 3.2 - Add products and list them in the table

Given the user navigates to the myproducts page
When the user adds the products "SAP NETWEAVER 7.5", "SAP NETWEAVER 7.4", "SAP S/4HANA 2021", "SAP S/4HANA 2022", "SAP S/4HANA 2025"
Then the table shows "PAM-Products (5/1554)"
When the user clicks the "My products" filter in the table
Then the table shows 5 entries

<a id="test-3-3"></a>

### 3.3 - Add and remove a product

Given the user navigates to the myproducts page
Then the table shows "PAM-Products (0/1554)"
When the user selects the 2nd entry in the table
And clicks "Add"
Then the table shows "PAM-Products (1/1554)"
When the user selects the 2nd entry again
And clicks "Add"
Then the product is removed from the list of own products
And the table shows "PAM-Products (0/1554)"

<a id="test-3-4"></a>

### 3.4 - Navigate away without saving

Given the user navigates to the myproducts page
When the user selects the 2nd entry in the table
And navigates to the supportstatus page without clicking "Add"
And navigates back to the myproducts page
Then the table shows "PAM-Products (0/1554)"

<a id="test-3-5"></a>

### 3.5 - "My products" scope filter with no own products

Given the user has not selected any own products
When the user clicks the "My products" filter in the table
Then the table shows no entries

<a id="test-4"></a>

## 4 - Create own product

Given the user navigates to the myproducts page
When the user clicks "Create product"
Then the form is shown
When the user clicks "Cancel"
Then the myproducts page is shown

<a id="test-4-1"></a>

### 4.1 - Add a new product

Given the user navigates to the myproducts page
When the user clicks "Create product"
Then the form is shown
When the user fills in the required fields
And clicks "Add"
And navigates to the supportstatus page
Then the newly added product is shown

<a id="test-4-2"></a>

### 4.2 - Required fields missing

Given the user navigates to the myproducts page
When the user clicks "Create product"
And does not fill in the required fields
And clicks "Add"
Then the product is not created

<a id="test-4-3"></a>

### 4.3 - Add a new product with all fields filled in

Given the user navigates to the myproducts page
When the user clicks "Create product"
Then the form is shown
When the user fills in all fields
And clicks "Add"
And navigates to the supportstatus page
Then the newly added product is shown

<a id="test-5"></a>

## 5 - Upload / Download

<a id="test-5-1"></a>

### 5.1 - Upload PAM.json (valid)

Given the user clicks the "Upload PAM.json" button
When the user selects a valid PAM.json file
Then the table is replaced entirely with the new data
And a toast shows the number of loaded entries

<a id="test-5-2"></a>

### 5.2 - Upload PAM.json (invalid)

Given the user clicks the "Upload PAM.json" button
When the user selects a file with malformed JSON
Then an error message is shown and the table stays unchanged
When the user uploads a file with valid JSON that is not an array
Then an error message is shown and the table stays unchanged
When the user uploads an array that contains invalid entries
Then an error message is shown and the table stays unchanged

<a id="test-5-3"></a>

### 5.3 - Upload OwnProducts.json (app toolbar)

Given the user clicks the "Upload OwnProducts.json" button
When the user selects a valid OwnProducts.json file
Then the list of own products is replaced entirely
And a toast shows the number of loaded entries

<a id="test-5-4"></a>

### 5.4 - Upload OwnProducts.json (invalid)

Given the user clicks the "Upload OwnProducts.json" button
When the user selects a file with malformed JSON
Then an error message is shown and the own products stay unchanged
When the user uploads a file with valid JSON that is not an array
Then an error message is shown and the own products stay unchanged
When the user uploads an array that contains invalid entries
Then an error message is shown and the own products stay unchanged

<a id="test-5-5"></a>

### 5.5 - Download own products

Given the user navigates to the myproducts page
When the user adds at least 1 product
And clicks the "Download" button
Then OwnProducts.json is downloaded
When the user removes all products
Then the download button is hidden, or a "no own products" message is shown

<a id="test-6"></a>

## 6 - Product detail

<a id="test-6-1"></a>

### 6.1 - Show product detail

Given the user is on the Main table
When the user clicks a row
Then the product detail page opens, showing the product data and the lifecycle timeline

<a id="test-6-2"></a>

### 6.2 - Toggle own product from the product detail page

Given the user is on the Main table
When the user clicks a row
And clicks "Add own product"
And navigates to the myproducts page
Then the product is selected
When the user navigates to the supportstatus page
Then the product is shown
When the user navigates back to the product detail page
And clicks "Remove own product"
And navigates to the myproducts page
Then the product is no longer selected

<a id="test-6-3"></a>

### 6.3 - Show product detail with German locale

Given the user's browser locale is German (de-DE)
And the user is on the Main table
When the user clicks a row
Then the product detail page opens, showing the product data and the lifecycle timeline

<a id="test-6-4"></a>

### 6.4 - Open support portal

Given the user is on the Main table
When the user clicks a row
Then clicking "Open support portal" opens the entry's SAP Support Portal URL in a new tab

<a id="test-6-5"></a>

### 6.5 - Support status icon reflects approaching end of mainstream maintenance

Given the user searches for "SBOP BI PLATFORM 4.3" (mainstream maintenance ends within 6 months)
Then the support status is shown as critical (error)
When the user navigates back to the Main table
And searches for "SAP SERVICE ASSET MANAGER 2505" (mainstream maintenance ends within 12 months)
Then the support status is shown as a warning
