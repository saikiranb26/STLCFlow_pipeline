export const MATCH_SHELL_SELECTORS = {
  loginUserName: "#UserName, #username, input[name='UserName'], input[name='username'], input[autocomplete='username']",
  loginPassword: "#Password, #password, input[name='Password'], input[name='password'], input[type='password']",
  loginSubmit: "input[type='submit'].loginButton, #kc-login, input[name='login'], input[type='submit'], button[type='submit']",
  shellMarkers: "text=/scheduler|tasks|dashboard|results|manage|certification|partner1|partner2|partner3/i",
  topNavItems: [
    "header a",
    "nav a",
    ".navbar a",
    ".top-nav a",
    "[role='tab']",
    "[role='menuitem']"
  ],
  actionables: [
    "a",
    "button",
    "[role='button']",
    "[role='link']",
    "[role='menuitem']",
    "[role='tab']"
  ]
} as const;
