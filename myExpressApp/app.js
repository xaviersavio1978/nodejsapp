// ... existing require statements and setup

app.use('/', indexRouter);
app.use('/users', usersRouter);

// =============================
// Form submission route
// =============================
app.post('/submit-form', (req, res) => {
  const { name, email, address, phone } = req.body;
  console.log('Form Submission:', { name, email, address, phone });
  res.send(`<h2>Thank you, ${name}! Your form has been submitted.</h2>`);
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
