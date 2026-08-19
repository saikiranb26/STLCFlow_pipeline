Feature: LegacyReports

  @LegacyReports @ui @generated @207435
  Scenario: 207435_TRUIST-Retain Pagination State When Returning to Legacy Reports List - Verify Actions menu options are displayed for a report
    Given I login to Match
    When I open the Legacy Reports page
    When I open the Actions menu for a report on Legacy Reports
    Then I verify the Legacy Reports Actions menu shows 'Move, Duplicate, Download, Delete'

  @LegacyReports @ui @generated @207436
  Scenario: 207436_TRUIST-Retain Pagination State When Returning to Legacy Reports List - Verify page number is retained after Move action
    Given I login to Match
    When I open the Legacy Reports page
    When I ensure the Legacy Reports list has more than one page
    When I go to page '2' on Legacy Reports
    When I select the 'Move' action from the Legacy Reports Actions menu
    When I choose the 'System' folder and save the Legacy Reports action
    Then I verify the Legacy Reports page number is retained

  @LegacyReports @ui @generated @207437
  Scenario: 207437_TRUIST-Retain Pagination State When Returning to Legacy Reports List - Verify page size is retained after Duplicate action
    Given I login to Match
    When I open the Legacy Reports page
    When I set the Legacy Reports page size to a supported value
    When I select the 'Duplicate' action from the Legacy Reports Actions menu
    When I choose the 'System' folder and save the Legacy Reports action
    Then I verify the Legacy Reports page size is retained

  @LegacyReports @ui @generated @207438
  Scenario: 207438_TRUIST-Retain Pagination State When Returning to Legacy Reports List - Verify page number and page size are retained after Delete action
    Given I login to Match
    When I open the Legacy Reports page
    When I set the Legacy Reports page size to a supported value
    When I go to page '2' on Legacy Reports
    When I select the 'Delete' action from the Legacy Reports Actions menu
    When I confirm the Legacy Reports delete action
    Then I verify the Legacy Reports page number and page size are retained

  @LegacyReports @ui @generated @207439
  Scenario: 207439_TRUIST-Retain Pagination State When Returning to Legacy Reports List - Verify current page and page size are not reset after Download action
    Given I login to Match
    When I open the Legacy Reports page
    When I set the Legacy Reports page size to a supported value
    When I go to page '2' on Legacy Reports
    When I select the 'Download' action from the Legacy Reports Actions menu
    Then I verify the Legacy Reports page size is retained

  @LegacyReports @ui @generated @207440
  Scenario: 207440_TRUIST-Retain Pagination State When Returning to Legacy Reports List - Verify browser Back and Forward retain selected page and page size
    Given I login to Match
    When I open the Legacy Reports page
    When I set the Legacy Reports page size to a supported value
    When I go to page '3' on Legacy Reports
    When I click the browser Back button
    When I click the browser Forward button
    Then I verify the Legacy Reports page size is retained
