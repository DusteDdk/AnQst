#!/bin/bash

set -euo pipefail

if [ "$#" -ne 1 ]
then
    echo "usage: $0 <example_qt_app_binary>" >&2
    exit 2
fi

example_binary="$1"
log_file="$(mktemp)"
app_pid=""

cleanup() {
    if [ -n "$app_pid" ] && kill -0 "$app_pid" 2>/dev/null
    then
        kill "$app_pid" 2>/dev/null || true
        wait "$app_pid" 2>/dev/null || true
    fi
    rm -f "$log_file"
}

trap cleanup EXIT

xvfb-run -a "$example_binary" >"$log_file" 2>&1 &
app_pid="$!"

sleep 5

if ! kill -0 "$app_pid" 2>/dev/null
then
    set +e
    wait "$app_pid"
    exit_code="$?"
    set -e
    if [ "$exit_code" -ne 0 ]
    then
        cat "$log_file" >&2
        exit "$exit_code"
    fi
fi

kill "$app_pid" 2>/dev/null || true
wait "$app_pid" 2>/dev/null || true

if rg -n "Cannot convert 0 to a BigInt|TypeError: Cannot convert 0 to a BigInt|\\[Timeout\\] CdEntryService\\.showDraft|slot invocation timeout|Aborted \\(core dumped\\)" "$log_file" >/dev/null
then
    cat "$log_file" >&2
    exit 1
fi
