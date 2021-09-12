const portFolioHeader = (model, user_id) => {
  const { portfolio_id, portfolio_descripcion } = model;
  return {
    portfolio_id,
    portfolio_descripcion,
    user_id,
  };
};

class PortfolioDao {
  constructor(db) {
    this._db = db;
  }

  add(model, user_id, portfolio_id) {
    const header = portFolioHeader(model, user_id);
    const { items } = model;
    const id = portfolio_id || header.portfolio_id;
    if (id) {
      return this.updateModel(id, header, items);
    } else {
      return this.insertModel(header, items);
    }
  }

  remove(portfolio_id) {
    const deleteItems = this.deleteAllItems(portfolio_id);
    const deletePortFolio = this.deletePortfolio(portfolio_id);
    return Promise.all([deleteItems, deletePortFolio]);
  }

  updateModel(portfolio_id, header, items) {
    const { portfolio_descripcion } = header;
    const self = this;
    return new Promise((resolve, reject) => {
      this._db.run(
        `
          UPDATE portfolio
              SET portfolio_descripcion = ?
          WHERE
              portfolio_id = ?
        `,
        [portfolio_descripcion, portfolio_id],
        function (err) {
          if (err) {
            console.log(err);
            return reject("Can`t update portfolio");
          }
          self.saveItems(portfolio_id, items).then(
            () => {
              resolve(portfolio_id);
            },
            (err) => {
              console.log(err);
              return reject("Can`t add portfolio item");
            }
          );
        }
      );
    });
  }

  insertModel(header, items) {
    const { portfolio_descripcion, user_id } = header;
    const self = this;
    return new Promise((resolve, reject) => {
      this._db.run(
        `
                INSERT INTO portfolio (
                    portfolio_descripcion, 
                    user_id,
                    portfolio_create_date
                    ) values (?,?,?)
                `,
        [portfolio_descripcion, user_id, new Date()],
        function (err) {
          if (err) {
            console.log(err);
            return reject("Can`t add portfolio");
          }
          self.saveItems(this.lastID, items).then(
            () => {
              resolve(this.lastID);
            },
            (err) => {
              console.log(err);
              return reject("Can`t add portfolio item");
            }
          );
        }
      );
    });
  }

  saveItems(portfolio_id, items) {
    const itemsPromise = items
      ? items.map((item) => this.insertItem(portfolio_id, item))
      : [Promise.resolve()];
    return Promise.all([...itemsPromise]);
  }

  insertItem(portfolio_id, item) {
    const { acciones_id, item_quantidade, item_precio } = item;
    return new Promise((resolve, reject) => {
      this._db.run(
        `
        INSERT INTO portfolio_item (
          portfolio_id,
          acciones_id,	
          item_quantidade,
          item_precio
        ) values (?,?,?,?)
      `,
        [portfolio_id, acciones_id, item_quantidade, item_precio],
        (err) => {
          if (err) {
            console.log(err);
            return reject("Can`t add portfolio item");
          }
          resolve();
        }
      );
    });
  }

  deleteAllItems(portfolio_id) {
    return new Promise((resolve, reject) => {
      this._db.run(
        `
        DELETE FROM portfolio_item where portfolio_id = ?;
      `,
        [portfolio_id],
        (err) => {
          if (err) {
            console.log("Delete item");
            console.log(err);
            return reject("Can`t add portfolio");
          }
          resolve();
        }
      );
    });
  }

  deletePortfolio(portfolio_id) {
    return new Promise((resolve, reject) => {
      this._db.run(
        `
        DELETE FROM portfolio where portfolio_id = ?;
      `,
        [portfolio_id],
        (err) => {
          if (err) {
            console.log("Delete header");
            console.log(err);
            return reject("Can`t delete portfolio");
          }
          resolve();
        }
      );
    });
  }

  listAllFromUser(user_id) {
    return new Promise((resolve, reject) => {
      this._db.all(
        `
          SELECT
            portfolio_id,
            portfolio_descripcion,
            user_id 
          FROM portfolio
          WHERE 
            user_id = ?
        `,
        [user_id],
        (err, rows) => {
          if (err) {
            console.log("++++ERRO+++");
            console.log(err);
            return reject("Can`t load portfolio");
          }
          return resolve(rows);
        }
      );
    });
  }

  findById(user_id, portfolio_id) {
    return new Promise((resolve, reject) => {
      this._db.all(
        `
          SELECT
            portfolio.portfolio_id,
            portfolio_descripcion,
            user_id,
            item_id,
            item_quantidade,
            item_precio,
            acciones_id
          FROM portfolio 
          LEFT JOIN portfolio_item  ON
            portfolio.portfolio_id = portfolio_item.portfolio_id
          WHERE 
            user_id = ? AND
            portfolio.portfolio_id = ?
          ORDER BY
            item_id
        `,
        [user_id, portfolio_id],
        (err, rows) => {
          if (err) {
            console.log("++++ERRO+++");
            console.log(err);
            return reject("Can`t load portfolio");
          }
          const [first] = rows;
          if (first) {
            const header = {
              portfolio_id,
              portfolio_descripcion: first.portfolio_descripcion,
              user_id,
            };
            const items = rows.map((row) => ({
              item_quantidade: row.item_quantidade,
              item_precio: row.item_precio,
              acciones_id: row.acciones_id,
            }));
            return resolve({ ...header, items });
          }
          return resolve({});
        }
      );
    });
  }
}

module.exports = PortfolioDao;
