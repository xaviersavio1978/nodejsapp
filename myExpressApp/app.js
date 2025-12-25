var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fs = require('fs');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

const { TableClient } = require("@azure/data-tables");
const { DefaultAzureCredential } = require("@azure/identity");

var app = express();

// ============================
// Azure Table Storage setup
// ============================

// Storage account from environment
const account = process.env.AZURE_STORAGE_ACCOUNT_NAME;
if (!account) throw new Error("AZURE_STORAGE_ACCOUNT_NAME environment variable is required.");

// Determine branch from environment (set in GitHub Actions)
const branch = process.env.BRANCH_NAME || "main";

// Load table mapping from tables.json
const tablesPath = path.join(__dirname, 'tables.json');
const tablesJSON = fs.readFileSync(tablesPath);
const allTables = JSON.parse(tablesJSON);

if (!allTables[branch]) {
  throw new Error(`Branch mapping not found for branch: ${branch}`);
}
const branchTables = allTables[branch];

// Factory to get TableClient for any logical table
function getTableClient(logicalName) {
  const tableName = branchTables[logicalName];
  if (!tableName) {
    throw new Error(`Table mapping for '${logicalName}' not found in branch '${branch}'`);
  }
  return new TableClient(`https://${account}.table.core.windows.net`, tableName, new DefaultAzureCredential());
}

// Example clients
const formClient = getTableClient("FormSubmissions");
const userClient = getTableClient("UserProfiles");

// ============================
// Express app setup
// ============================

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// Form submission route
app.post('/submit-form', async (req, res) => {
  const { name, email, address, phone } = req.body;

  const entity = {
    partitionKey: "submissions",
    rowKey: new Date().getTime().toString(),
    name,
    email,
    address,
    phone
  };

  try {
    await formClient.createEntity(entity);
    res.send(`
      <h2>Thank you, ${name}!</h2>
      <p>We received your submission.</p>
      <p>Email: ${email}</p>
      <p>Address: ${address}</p>
      <p>Phone: ${phone}</p>
    `);
  } catch (err) {
    console.error("Error saving submission:", err);
    res.status(500).send("Failed to save form data.");
  }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// Listen on Azure port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});

module.exports = app;
