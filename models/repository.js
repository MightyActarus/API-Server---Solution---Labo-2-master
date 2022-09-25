///////////////////////////////////////////////////////////////////////////
// This class provide CRUD operations on JSON objects collection text file
// with the assumption that each object have an Id member.
// If the objectsFile does not exist it will be created on demand.
/////////////////////////////////////////////////////////////////////
// Author : Nicolas Chourot
// Lionel-Groulx College
/////////////////////////////////////////////////////////////////////

const fs = require('fs');
const utilities = require('../utilities.js');


class Repository {
    constructor(model) {
        this.objectsList = null;
        this.model = model;
        this.objectsName = model.getClassName() + 's';
        this.objectsFile = `./data/${this.objectsName}.json`;
        this.bindExtraDataMethod = null;
        this.updateResult = {
            ok: 0,
            conflict: 1,
            notFound: 2,
            invalid: 3
        }
    }
    setBindExtraDataMethod(bindExtraDataMethod) {
        this.bindExtraDataMethod = bindExtraDataMethod;
    }
    objects() {
        if (this.objectsList == null)
            this.read();
        return this.objectsList;
    }
    read() {
        try {
            let rawdata = fs.readFileSync(this.objectsFile);
            // we assume here that the json data is formatted correctly
            this.objectsList = JSON.parse(rawdata);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // file does not exist, it will be created on demand
                log(FgYellow, `Warning ${this.objectsName} repository does not exist. It will be created on demand`);
                this.objectsList = [];
            } else {
                log(Bright, FgRed, `Error while reading ${this.objectsName} repository`);
                log(Bright, FgRed, '--------------------------------------------------');
                log(Bright, FgRed, error);
            }
        }
    }
    write() {
        fs.writeFileSync(this.objectsFile, JSON.stringify(this.objectsList));
    }
    nextId() {
        let maxId = 0;
        for (let object of this.objects()) {
            if (object.Id > maxId) {
                maxId = object.Id;
            }
        }
        return maxId + 1;
    }
    add(object) {
        try {
            if (this.model.valid(object)) {
                let conflict = false;
                if (this.model.key) {
                    conflict = this.findByField(this.model.key, object[this.model.key]) != null;
                }
                if (!conflict) {
                    object.Id = this.nextId();
                    this.objectsList.push(object);
                    this.write();
                } else {
                    object.conflict = true;
                }
                return object;
            }
            return null;
        } catch (error) {
            console.log(FgRed, `Error adding new item in ${this.objectsName} repository`);
            console.log(FgRed, '-------------------------------------------------------');
            console.log(Bright, FgRed, error);
            return null;
        }
    }
    update(objectToModify) {
        if (this.model.valid(objectToModify)) {
            let conflict = false;
            if (this.model.key) {
                conflict = this.findByField(this.model.key, objectToModify[this.model.key], objectToModify.Id) != null;
            }
            if (!conflict) {
                let index = 0;
                for (let object of this.objects()) {
                    if (object.Id === objectToModify.Id) {
                        this.objectsList[index] = objectToModify;
                        this.write();
                        return this.updateResult.ok;
                    }
                    index++;
                }
                return this.updateResult.notFound;
            } else {
                return this.updateResult.conflict;
            }
        }
        return this.updateResult.invalid;
    }
    remove(id) {
        let index = 0;
        for (let object of this.objects()) {
            if (object.Id === id) {
                this.objectsList.splice(index, 1);
                this.write();
                return true;
            }
            index++;
        }
        return false;
    }
    getAll(params = null) {
        let objectsList = this.objects();
        if (this.bindExtraDataMethod != null) {
            objectsList = this.bindExtraData(objectsList);
        }
        if (params) {
            // TODO Laboratoire 2
        }
        return objectsList;
    }
    get(id) {
        for (let object of this.objects()) {
            if (object.Id === id) {
                if (this.bindExtraDataMethod != null)
                    return this.bindExtraDataMethod(object);
                else
                    return object;
            }
        }
        return null;
    }
    removeByIndex(indexToDelete) {
        if (indexToDelete.length > 0) {
            utilities.deleteByIndex(this.objects(), indexToDelete);
            this.write();
        }
    }
    findByField(fieldName, value, excludedId = 0) {
        if (fieldName) {
            let index = 0;
            for (let object of this.objects()) {
                try {
                    if (object[fieldName] === value) {
                        if (object.Id != excludedId)
                            return this.objectsList[index];
                    }
                    index++;
                } catch (error) {
                    break;
                }
            }
        }
        return null;
    }
}

module.exports = Repository;