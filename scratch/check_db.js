const pool = require('../src/config/database');
async function check() {
  try {
    const constr = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = 'exemplars'::regclass
    `);
    console.log('Exemplars Constraints:', constr.rows);
    
    const constrBooks = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = 'books'::regclass
    `);
    console.log('Books Constraints:', constrBooks.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
check();
