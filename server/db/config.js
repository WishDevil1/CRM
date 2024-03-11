const mongoose = require('mongoose');
const User = require('../model/schema/user');
const bcrypt = require('bcrypt');
const { initializeLeadSchema } = require("../model/schema/lead");
const { initializeContactSchema } = require("../model/schema/contact");
const { initializePropertySchema } = require("../model/schema/property");
const { createNewModule } = require("../controllers/customField/customField.js");
const customField = require('../model/schema/customField.js');

const initializedSchemas = async () => {
    await initializeLeadSchema();
    await initializeContactSchema();
    await initializePropertySchema();

    const CustomFields = await customField.find({ deleted: false });

    const createDynamicSchemas = async (CustomFields) => {
        for (const module of CustomFields) {
            const { moduleName, fields } = module;

            // Check if schema already exists
            if (!mongoose.models[moduleName]) {
                // Create schema object
                const schemaFields = {};
                for (const field of fields) {
                    schemaFields[field.name] = { type: field.backendType };
                }
                // Create Mongoose schema
                const moduleSchema = new mongoose.Schema(schemaFields);
                // Create Mongoose model
                mongoose.model(moduleName, moduleSchema, moduleName);
                console.log(`Schema created for module: ${moduleName}`);
            } else {
                // console.log(`Schema for module ${moduleName} already exists`);
            }
        }
    };

    createDynamicSchemas(CustomFields);

    // const mongooseModels = mongoose.models;
    // const schemas = Object.keys(mongooseModels).map(modelName => {
    //     const model = mongooseModels[modelName];
    //     return {
    //         modelName,
    //         schema: model.schema
    //     };
    // });

    // // Log or process the schemas as needed
    // console.log("All initialized schemas:", schemas);

}

const connectDB = async (DATABASE_URL, DATABASE) => {
    try {
        const DB_OPTIONS = {
            dbName: DATABASE
        }

        mongoose.set("strictQuery", false);
        await mongoose.connect(DATABASE_URL, DB_OPTIONS);

        await initializedSchemas();

        /* this was temporary  */
        const mockRes = {
            status: (code) => {
                return {
                    json: (data) => { }
                };
            },
            json: (data) => { }
        };

        // Create default modules
        await createNewModule({ body: { moduleName: 'Lead', fields: [], headings: [] } }, mockRes);
        await createNewModule({ body: { moduleName: 'Contact', fields: [], headings: [] } }, mockRes);
        await createNewModule({ body: { moduleName: 'Property', fields: [], headings: [] } }, mockRes);
        /*  */

        let adminExisting = await User.find({ role: 'superAdmin' });
        if (adminExisting.length <= 0) {
            const phoneNumber = 7874263694
            const firstName = 'Prolink'
            const lastName = 'Infotech'
            const username = 'admin@gmail.com'
            const password = 'admin123'
            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);
            // Create a new user
            const user = new User({ _id: new mongoose.Types.ObjectId('64d33173fd7ff3fa0924a109'), username, password: hashedPassword, firstName, lastName, phoneNumber, role: 'superAdmin' });
            // Save the user to the database
            await user.save();
            console.log("Admin created successfully..");
        } else if (adminExisting[0].deleted === true) {
            await User.findByIdAndUpdate(adminExisting[0]._id, { deleted: false });
            console.log("Admin Update successfully..");
        } else if (adminExisting[0].username !== "admin@gmail.com") {
            await User.findByIdAndUpdate(adminExisting[0]._id, { username: 'admin@gmail.com' });
            console.log("Admin Update successfully..");
        }

        console.log("Database Connected Successfully..");
    } catch (err) {
        console.log("Database Not connected", err.message);
    }
}
module.exports = connectDB