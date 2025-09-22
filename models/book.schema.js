// import { Schema, model } from 'mongoose';
// import AutoIncrement from "mongoose-sequence";
// const bookSchema = new Schema(
//     {
//         // Core Book Information
//         book_id: {
//             type: Number,
//             required: true,
//             unique: true, // Ensures each book has a unique ID
//         },
//         title: {    
//             type: String,
//             default: null,
//             trim: true, // Removes whitespace from both ends of a string
//         },
//         author: {
//             type: String,
//             default: null,
//             trim: true,
//         },
//         edition: {
//             type: String,
//             default: null,
//         },
//         year: {
//             type: Number,
//             default: null,
//         },

//         // Publisher Information
//         publisher_name: {
//             type: String,
//             default: null,
//             trim: true,
//         },

//         // Identifiers
//         isbn: {
//             type: String,
//             default: null,
//         },
//         nonisbn: {
//             type: String,
//             default: null,
//         },
//         other_code: {
//             type: String,
//             default: null,
//         },

//         // Physical and Categorical Details
//         binding_type: {
//             type: String,
//             default: null,
//         },
//         classification: {
//             type: String,
//             default: null,
//         },
//       // Additional Information
//         remarks: {
//             type: String,
//             default: null,
//         },
//     },
//     {
//         // Options
//         timestamps: true, // Automatically adds createdAt and updatedAt fields
//     }
// );

// // Optional: Create an index for frequently queried fields like title and author for better performance
// bookSchema.index({ title: 'text', author: 'text' });
// bookSchema.plugin(AutoIncrement(mongoose), { inc_field: "book_id" });
// const Book = model('Book', bookSchema);

// export default Book;


import { Schema, model } from 'mongoose';

const bookSchema = new Schema(
    {
        title: { type: String, default: null, trim: true },
        author: { type: String, default: null, trim: true },
        edition: { type: String, default: null },
        year: { type: Number, default: null },
        publisher_name: { type: String, default: null, trim: true },
        isbn: { type: String, default: null, unique: true, sparse: true },
        nonisbn: { type: String, default: null },
        other_code: { type: String, default: null },
        binding_type: { type: String, default: null },
        classification: { type: String, default: null },
        remarks: { type: String, default: null },
        tags: { type: [String], default: [] },
    },
    { timestamps: true }
);

bookSchema.index({ title: 'text', author: 'text' });

const Book = model('Book', bookSchema);
export default Book;