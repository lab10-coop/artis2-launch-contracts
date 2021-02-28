#!/usr/bin/env bash

# uses poa-flattener instead of truffle-flattener because it can handle cycles in the dependency graph
# doesn't contain all contracts. Add to the list if you want something missing.

if [ -d flats ]; then
  rm -rf flats
fi

FLATTENER=./node_modules/.bin/poa-solidity-flattener

$FLATTENER contracts/Artis2Launch.sol flats/
$FLATTENER contracts/ERC677TokenMock.sol flats/
$FLATTENER contracts/XATSToken.sol flats/
