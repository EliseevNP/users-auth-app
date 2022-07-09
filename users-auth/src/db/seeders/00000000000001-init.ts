import fs from 'fs';
import path from 'path';
import { QueryInterface } from 'sequelize';

export = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const transaction = await queryInterface.sequelize.transaction({ autocommit: false });

    try {
      await queryInterface.bulkInsert(
        'users',
        JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../data/seeds/users.json')).toString('utf-8')),
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error);

      await transaction.rollback();

      throw error;
    }
  },
  down: async (queryInterface: QueryInterface): Promise<void> => {
    const transaction = await queryInterface.sequelize.transaction({ autocommit: false });

    try {
      await queryInterface.bulkDelete('users', {}, { transaction });

      await transaction.commit();
    } catch (error) {
    // eslint-disable-next-line no-console
      console.log(error);

      await transaction.rollback();

      throw error;
    }
  },
};
