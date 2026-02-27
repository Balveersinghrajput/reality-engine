function validate(schema) {
    return (req, res, next) => {
      try {
        req.body = schema.parse(req.body);
        next();
      } catch (err) {
        return res.status(422).json({
          success: false,
          message: err.errors?.[0]?.message || 'Validation failed',
        });
      }
    };
  }
  
  module.exports = { validate };