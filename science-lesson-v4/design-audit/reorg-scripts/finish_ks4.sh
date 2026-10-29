#!/bin/bash
cd "C:/Users/magda/AppData/Local/Temp/claude/c--Users-magda-claude-projects-science-lesson-v4/c4624cd3-0371-4d84-8ef9-3b5e2f5ca7fb/scratchpad"
echo "=== [1/2] Chemistry (C3 + C6 missed lessons) ==="
touch staging_ks4/Chemistry/.ok
python copy_ks4.py Chemistry --go
echo "=== clearing partial Biology staging for a clean full extract ==="
rm -rf staging_ks4/Biology
echo "=== [2/2] Biology (fresh full extract + copy) ==="
python copy_ks4.py Biology --go
echo "=== FINISH_KS4 DONE ==="
