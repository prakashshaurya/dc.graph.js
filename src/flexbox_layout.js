dc_graph.flexbox_layout = function(id) {
    var _layoutId = id || uuid();

    var _tree, _nodes = {};

    function init(options) {
    }
    // like d3.nest but address can be of arbitrary (and different) length
    // probably less efficient too
    function add_node(adhead, adtail, n, tree) {
        tree.address = adhead.slice();
        tree.children = tree.children || {};
        if(!adtail.length) {
            tree.node = n;
            return;
        }
        var t = tree.children[adtail[0]] = tree.children[adtail[0]] || {};
        adhead.push(adtail.shift());
        add_node(adhead, adtail, n, t);
    }
    function all_keys(tree) {
        var key = _engine.addressToKey(tree.address);
        return Array.prototype.concat.apply([key], Object.keys(tree.children).map(function(k) {
            return all_keys(tree.children[k]);
        }));
    }
    function data(nodes) {
        _tree = {};
        nodes.forEach(function(n) {
            var ad = _engine.nodeAddress.eval(n);
            add_node([], ad, n, _tree);
        });
        var need = all_keys(_tree);
        var wnodes = regenerate_objects(_nodes, nodes, need, function(n) {
            return n.dcg_nodeKey;
        }, function(n1, n) {
        });
    }
    function start() {
    }
    function stop() {
    }

    var _engine = Object.assign(graphviz, {
        layoutAlgorithm: function() {
            return 'cola';
        },
        layoutId: function() {
            return _layoutId;
        },
        supportsWebworker: function() {
            return true;
        },
        needsStage: function(stage) { // stopgap until we have engine chaining
            return stage === 'ports' || stage === 'edgepos';
        },
        parent: property(null),
        on: function(event, f) {
            _dispatch.on(event, f);
            return this;
        },
        init: function(options) {
            this.optionNames().forEach(function(option) {
                options[option] = options[option] || this[option]();
            }.bind(this));
            init(options);
            return this;
        },
        data: function(nodes, edges, constraints, options) {
            data(nodes, edges, constraints, options);
        },
        start: function() {
            start();
        },
        stop: function() {
            stop();
        },
        optionNames: function() {
            return []
                .concat(graphviz_keys);
        },
        populateLayoutNode: function() {
        },
        populateLayoutEdge: function() {},
        nodeAddress: property(function(n) { return n.value.address; }),
        addressToKey: property(function(ad) { return ad.join(','); }),
        keyToAddress: property(function(nid) { return nid.split(','); })
    });
    return engine;
};

dc_graph.flexbox_layout.scripts = ['css-layout.js'];
