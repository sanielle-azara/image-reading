const mysql = require('mysql');

const connection = mysql.createConnection({
  host: 'mysql',
  user: 'root',
  password: 'root',
  database: 'image_reading',
  port: '3306',
});

connection.connect((err) => {
  if (err) {
    console.log('Erro connecting to database...', err);
    return;
  }
  console.log('Connection established!');
});

module.exports = connection;
