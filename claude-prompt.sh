#!/bin/bash
# Send a prompt to Claude in tmux session `claude-fix` reliably.
# Usage: claude-prompt.sh "your prompt here"
SESSION="claude-fix"
TMPFILE="/tmp/claude-prompt.txt"
echo "$1" > "$TMPFILE"
tmux send-keys -t "$SESSION" Enter
sleep 0.3
tmux load-buffer -b clip "$TMPFILE"
tmux paste-buffer -b clip -t "$SESSION"
tmux send-keys -t "$SESSION" Enter
