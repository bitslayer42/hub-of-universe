// https://www.30secondsofcode.org/js/s/data-structures-tree/
class TreeNode {
    constructor(key, value = key, parent = null) {
        this.key = key;
        this.value = value;
        this.parent = parent;
        this.children = [];
    }

    get isLeaf() {
        return this.children.length === 0;
    }

    get hasChildren() {
        return !this.isLeaf;
    }
}

class Tree {
    constructor(key, value = key) {
        this.root = new TreeNode(key, value);
    }

    *traverse(node = this.root) {
        if (node.children.length) {
            for (let child of node.children) {
                yield* this.traverse(child);
            }
        }else{
            yield node;
        }
    }

    insert(parentNodeKey, key, value = key) {
        for (let node of this.traverse()) {
            if (node.key === parentNodeKey) {
                node.children.push(new TreeNode(key, value, node));
                return true;
            }
        }
        return false;
    }
}

export { Tree };