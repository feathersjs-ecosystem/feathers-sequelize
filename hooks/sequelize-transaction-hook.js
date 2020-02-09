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

    const sequelize = await hook.app.get("sequelizeClient");
    const transaction = await sequelize.transaction();

    hook.params.transaction = transaction;
    hook.params.transactionOwner = hook.path;
    hook.params.sequelize = hook.params.sequelize || {};
    hook.params.sequelize.transaction = transaction;

    return hook;
  };
};

const end = () => {
  return hook => {
    const { params } = hook.params;
    if (
      !params ||
      !params.transactionOwner ||
      params.transactionOwner !== hook.path
    ) {
      // transaction probably from diffrent hook or service
      // so we dont commit or rollback the transaction in this service
      return hook;
    }
    const trx = params.sequelize.transaction || params.transaction;
    return trx.then(t => t.commit()).then(() => hook);
  };
};

const rollback = () => {
  return hook => {
    const { params } = hook.params;
    if (
      !params ||
      !params.transactionOwner ||
      params.transactionOwner !== hook.path
    ) {
      // transaction probably from diffrent hook or service
      // so we dont commit or rollback the transaction in this service
      return hook;
    }
    const trx = params.sequelize.transaction || params.transaction;
    return trx.then(t => t.rollback()).then(() => hook);
  };
};

module.exports = {
  transaction: {
    start,
    end,
    rollback
  }
};
