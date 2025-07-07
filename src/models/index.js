class Item {
    constructor(name, description) {
        this.name = name;
        this.description = description;
    }

    validate() {
        if (!this.name || !this.description) {
            throw new Error("Name and description are required.");
        }
    }
}

module.exports = Item;