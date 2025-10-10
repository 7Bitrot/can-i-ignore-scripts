#!/bin/bash
node index.js > a
diff a test/expected.out
EXITCODE=$?
if [ $EXITCODE -gt 0 ]; then
  echo 'e2e FAILED'
  exit 1
fi

cat a
rm a
echo 'e2e PASSED'

