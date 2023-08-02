# Restic Backup GX #

A simple GUI for restic, built with Electron & Vue3

[Download](https://gitlab.com/stormking/resticguigx/-/releases)

Status: BETA - should work pretty well, just needs further testing for S3 and http repositories

![Screenshot](https://gitlab.com/stormking/resticguigx/-/raw/master/screenshot.png "Restic-Backup-GX")

## Features ##

- setup profiles for multiple backup locations
- pruning settings
- can store password
- shows repo size
- exclusion settings for paths and size
- restore to temp path or original path
- can mount to search files manually (if FUSE is installed)

## Roadmap ##

- expose the concept of snapshots better

## Change Log

### 2023-08-02 v0.11.0

- restic upgraded to v0.16
- restore shows progress-bar
- added settings to customize file change detection

## dev ##

### setup

- pnpm install
- download latest restic release 
- place in ./bin/linux/restic
- make executable
- pnpm run dev

