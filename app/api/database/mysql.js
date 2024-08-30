const mysql = require('mysql');

const con = mysql.createConnection({
  host: 'localhost:3306',
  user: 'root',
  password: 'root',
  database: 'image-reading-db',
});

con.connect((err) => {
  if (err) {
    console.log('Erro connecting to database...', err);
    return;
  }
  console.log('Connection established!');
});

con.end((err) => {
  if (err) {
    console.log('Erro to finish connection...', err);
    return;
  }
  console.log('The connection was finish...');
});
