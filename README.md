QA LatamFX/EdgeFX
==================
QA repo for end-to-end tests of LatamFX/EdgeFX
## To get up and running
Install `Node.js` and `npm` on your computer.
### Clone the repo
	git clone ...
### Install dependencies
	npm install
### Run tests
	mocha -t 60000 test/trading_widget_orders.js
## To contribute tests
Add new tests to the `tests` directory
### Lint & format
All files in the repo must pass lint (`eslint`) and format (`prettier`) rules.

To check formatting and linting:

	npm run lint
	npm run fmt

To fix formatting and linting:

	npm run lint-fix
	npm run fmt-fix
