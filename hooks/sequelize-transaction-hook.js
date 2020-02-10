const debug = require("debug")("feathers-sequelize-transaction");

/* eslint-disable require-atomic-updates */
const start = (options = {}) => {
  return async hook => {
    if (
      hook.params.transaction ||
      (hook.params.sequelize && options.params.sequelize.transaction)
    ) {
      // already in transaction probably in diffrent hook or service
      // so we dont create or commit the transaction in this service
      return hook;
    }

    const sequelize = hook.app.get("sequelizeClient");
    const transaction = await sequelize.transaction();
    transaction.owner = hook.path;

    hook.params.transaction = transaction;
    hook.params.sequelize = hook.params.sequelize || {};
    hook.params.sequelize.transaction = transaction;

    return hook;
  };
};

const end = () => {
  return async hook => {
    const trx = hook.params.sequelize.transaction || hook.params.transaction;

    if (!trx || !trx.owner || trx.owner !== hook.path) {
      // transaction probably from diffrent hook or service
      // so we dont commit or rollback the transaction in this service
      return hook;
    }
    await trx.commit().then(() => {
      delete hook.params.sequelize.transaction;
      delete hook.params.transaction;
    });
    return hook;
  };
};

const rollback = () => {
  return async hook => {
    const trx = hook.params.sequelize.transaction || hook.params.transaction;

    if (!trx || !trx.owner || trx.owner !== hook.path) {
      // transaction probably from diffrent hook or service
      // so we dont commit or rollback the transaction in this service
      return hook;
    }

    try {
      await trx.rollback();
      delete hook.params.sequelize.transaction;
      delete hook.params.transaction;
    } catch (err) {
      debug(err);
    }

    return hook;
  };
};

module.exports = {
  transaction: {
    start,
    end,
    rollback
  }
};
