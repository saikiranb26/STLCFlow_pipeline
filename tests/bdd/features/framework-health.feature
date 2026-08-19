@framework @nonui
Feature: STLCFlow framework health
  Scenario: Codex runtime configuration is readable
    Given the STLCFlow runtime configuration is available
    Then the Cadency base URL should be configured
    And Azure DevOps defaults should be available
