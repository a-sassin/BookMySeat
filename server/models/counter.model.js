const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    sequence_value: { type: Number, default: 100 },
});

module.exports = {
    counter: mongoose.model('counter', CounterSchema),
};
