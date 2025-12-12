ON DEVELOPMENT COMPUTER:

Recreate the static html packaged version of the game:

- open https://packager.turbowarp.org/
- load game file pong.sb3 form this folder
- import the settings from file turbowarp-packager-settings.json in this folder
    or check settings manually:
    - resolution is 640 x 320 px
    - NO turbo mode!
    - export plain html file
- move resulting Pong.html into this folder
- push to the git
- pull on the production computer(s)


ON PRODUCTION COMPUTER:

Update the game:
- pull from git
- exit running firefox
- start firefox in kiosk mode again with this comand:
    firefox --kiosk <projectdir>/game/Pong.html