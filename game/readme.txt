ON DEVELOPMENT COMPUTER:

Recreate the static html packaged version of the game:

- open https://packager.turbowarp.org/
- load game file pong.sb3 form this folder
    - resolution is 640 x 320 px
    - NO turbo mode!
    - export plain html file
- move resulting pong.html in this folder
- push it to the git
- pull it on the production computer(s)


ON PRODUCTION COMPUTER:

Update the game:
- pull from git
- call restart.sh script in this folder