import { QueryInterface, DataTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

export = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const transaction = await queryInterface.sequelize.transaction({ autocommit: false });

    try {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"', { transaction });

      await queryInterface.createTable('users', {
        user_id: {
          primaryKey: true,
          type: DataTypes.UUID,
          defaultValue: Sequelize.literal('uuid_generate_v4()::uuid'),
        },
        username: {
          type: DataTypes.STRING,
          unique: true,
          allowNull: false,
        },
        password_hash: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        surname: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        patronymic: {
          type: DataTypes.STRING,
          allowNull: true,
        },
      }, {
        // IDK why comment option exists in docs, but do not declared in class
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        comment: 'Пользователи',
        transaction,
      });

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
      await queryInterface.dropTable('users', { transaction });

      await transaction.commit();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error);

      await transaction.rollback();

      throw error;
    }
  },
};
