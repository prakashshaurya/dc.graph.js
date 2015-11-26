
// http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
var querystring = (function(a) {
    if (a == "") return {};
    var b = {};
    for (var i = 0; i < a.length; ++i)
    {
        var p=a[i].split('=', 2);
        if (p.length == 1)
            b[p[0]] = "";
        else
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
    }
    return b;
})(window.location.search.substr(1).split('&'));

var steptime = +querystring.interval || 1000, // ms per step
    pause = +querystring.pause || 2500, // pause at end of loop
    showSteps = +querystring.showsteps !== 0,
    file = querystring.file || null,
    generate = querystring.gen || null,
    shape = querystring.shape || null,
    radius = +querystring.radius || 25,
    fill = querystring.fill || 'white',
    nodeStroke = querystring.nodestroke || 'black',
    nodeStrokeWidth = querystring.nodestrokewidth || 1,
    randomize = +querystring.randomize || false,
    doReinit = querystring.reinit==="false" ? false : true,
    doDisplacement = querystring.displace==="false" ? false : true,
    doAlignment = querystring.align==="false" ? false : true,
    doOrdering = querystring.order==="false" ? false : true,
    isQFS = false,
    linkLength = +querystring.linklength || 30,
    edgeStroke = querystring.edgestroke || 'black',
    edgeStrokeWidth = querystring.edgestrokewidth || 1,
    opacity = +querystring.opacity || 1,
    do_qfs = false,
    nodePrefix = querystring.prefix || '',
    timeLimit = querystring.limit !== undefined ? +querystring.limit : 10000;
if(edgeStroke && /[0-9A-Fa-f]{6}/.test(edgeStroke) || /[0-9A-Fa-f]{3}/.test(edgeStroke))
    edgeStroke = '#' + edgeStroke;
var min = 2, max = 12;
var begin = 2, end = 12, curr = begin;
var doRender = true;

var diagram = dc_graph.diagram('#graph'), runner;

function do_status() {
    $('#now').css('left', (curr-min)/(max-min)*100 + '%');
    $('#status').text('[' + begin + '..' + end + '] : ' + curr);
}
function show_stats(data_stats, layout_stats) {
    $('#graph-stats').html(['<table>',
                            '<tr><td>Showing</td><td>' + layout_stats.nnodes + '/' + data_stats.totnodes + ' nodes</td></tr>',
                            '<tr><td></td><td>' + layout_stats.nedges + '/' + data_stats.totedges + ' edges</td></tr>',
                            '<tr><td>Last time</td><td>' + (runner.lastTime()/1000).toFixed(3) + 's</td></tr>',
                            '<tr><td>Avg time</td><td>' + (runner.avgTime()/1000).toFixed(3) + 's</td></tr>',
                            '</table>'].join(''));
}

do_status();

var source;
if(!generate && !file)
    file = "qfs.json";
isQFS = +querystring.qfs || file === 'qfs.json' && querystring.qfs !=="false";
if(isQFS) {
    do_qfs = true;
    if('qfscon' in querystring) {
        do_qfs = !!+querystring.qfscon;
        $('#qfs-constraints').prop('checked', do_qfs);
    }
    // not that it wouldn't be nice to have other animated examples...
    $('#stepper,#qfs-options').show();
    $('#controls').width(300);
}
if(file)
    source = function(callback) {
        dc_graph.load_graph(file, callback);
    }
else if(generate)
    source = function(callback) {
        // name plus at least one number, separated by commas
        var parts = /^([a-zA-Z]+)([0-9]+(?:,[0-9]+)*)$/.exec(generate);
        if(!parts || !parts[0]) throw new Error("couldn't parse generator");
        var name = parts[1], args = parts[2].split(',').map(function(n) { return +n; });
        var env = {
            linkLength: linkLength,
            nodePrefix: nodePrefix
        };
        dc_graph.generate(name, args, env, callback);
    }
if(shape) {
    var parts = shape.split(',');
    shape = {shape: parts[0]};
    switch(parts[0]) {
    case 'polygon':
        shape.sides = +parts[1];
        shape.skew = +parts[2] || 0;
        shape.distortion = +parts[3] || 0;
        shape.rotation = +parts[4] || 0;
        break;
    }
}
else shape = {shape: 'ellipse'};

source(function(error, data) {
    if(error) {
        console.log(error);
        return;
    }
    // infer some common structures for the json data
    if(!data.links && data.edges)
        data.links = data.edges;
    var sourceattr = "sourcename", targetattr = "targetname";
    if(!data.links[0][sourceattr]) {
        var sourceattrs = ["node1", "source", "tail"], targetattrs = ["node2", "target", "head"];
        if(data.links[0].node0 && data.links[0].node1) {
            sourceattr = 'node0';
            targetattr = 'node1';
        }
        else {
            var candidates = sourceattrs.filter(function(n) { return !!data.links[0][n]; });
            if(!candidates.length) {
                console.log("didn't find any source attr", sourceattrs);
                return;
            }
            if(candidates.length > 1)
                console.warn('found more than one possible source attr', candidates);
            sourceattr = candidates[0];
            var candidates = targetattrs.filter(function(n) { return !!data.links[0][n]; });
            if(!candidates.length)
                console.log("didn't find any target attr", targetattrs);
            if(candidates.length > 1)
                console.warn('found more than one possible target attr', candidates);
            targetattr = candidates[0];
        }
    }
    if(randomize) {
        data.links.forEach(function(e) { e.order = Math.random()*1000; });
        data.nodes.forEach(function(n) { n.order = Math.random()*1000; });
    }

    var edges = flat_group.make(data.links, function(d) {
        return d[sourceattr] + '-' + d[targetattr] + (d.par ? ':' + d.par : '');
    }),
        nodes = flat_group.make(data.nodes, function(d) { return d.name; });

    runner = make_runner(run, step,
                         function() {
                             return curr < end ? steptime : pause;
                         });

    function run() {
        do_status();
        if(doReinit)
            diagram.initLayoutOnRedraw(do_qfs);
        startDim.filterRange([0, curr]);
        $('#run-indicator').show();
        if(doRender) {
            dc.renderAll();
            doRender = false;
        }
        else
            dc.redrawAll();
        done = false;
    }
    function step() {
        if(++curr>end) curr = begin;
        run();
    }
    window.start_stop = function() {
        runner.toggle();
    };

    var qfs_constraints;
    if(isQFS) {
        qfs_constraint_rules.edges.forEach(function(c) {
            if(!doDisplacement && c.produce && !c.produce.type)
                c.disable = true;
            if(!doAlignment && c.produce && c.produce.type === 'alignment')
                c.disable = true;
            if(!doOrdering && c.produce && c.produce.type === 'ordering')
                c.disable = true;
        });
        qfs_constraints = dc_graph.constraint_pattern(diagram, qfs_constraint_rules);
    }

    function constrain(nodes, edges) {
        var constraints = [];
        if(qfs_constraints && do_qfs)
            constraints = qfs_constraints(nodes, edges, constraints);

        var circles = {};
        nodes.forEach(function(n, i) {
            if(n.orig.value.circle) {
                var circ = n.orig.value.circle;
                if(!circles[circ]) circles[circ] = [];
                circles[circ].push({node: n.orig.key});
            }
        });
        for(var circ in circles)
            constraints.push({
                type: 'circle',
                nodes: circles[circ]
            });
        return constraints;
    }

    diagram
        .width($(window).width())
        .height($(window).height())
        .timeLimit(timeLimit)
        .transitionDuration(0)
        .showLayoutSteps(showSteps)
        .nodeDimension(nodes.dimension).nodeGroup(nodes.group)
        .edgeDimension(edges.dimension).edgeGroup(edges.group)
        .edgeSource(function(e) { return e.value[sourceattr]; })
        .edgeTarget(function(e) { return e.value[targetattr]; })
        .nodeShape(shape)
        .nodeRadius(radius)
        .nodeFill(isQFS ? qfs_color : fill)
        .nodeStroke(nodeStroke)
        .nodeStrokeWidth(nodeStrokeWidth)
        .nodeFixed(isQFS ? function(n) { return n.value.class === 'Client' ? {x: 0, y: 0} : null; } : null)
        .constrain(constrain)
        .lengthStrategy(generate ? 'individual' :
                        do_qfs ? 'none' :
                        'symmetric')
        .edgeArrowhead(function(kv) {
            return kv.value.undirected ? null : 'vee';
        })
        .edgeOpacity(opacity)
        .edgeStroke(edgeStroke)
        .edgeStrokeWidth(edgeStrokeWidth)
        .on('end', function() {
            $('#run-indicator').hide();
            runner.endStep();
            show_stats({totnodes: data.nodes.length, totedges: data.links.length}, diagram.getStats());
        });
    if(linkLength)
        diagram.baseLength(linkLength);
    if(randomize) {
        diagram.nodeOrdering(function(kv) { return kv.value.order; })
            .edgeOrdering(function(kv) { return kv.value.order; });
    }

    // respond to browser resize (not necessary if width/height is static)
    $(window).resize(function() {
        diagram
            .width($(window).width())
            .height($(window).height());
    });



    // this is kind of a brain-dead way to test transitions
    // i mean, you can cram the concept of adding and deleting stuff over time
    // into crossfilter data, but do you really want to do that?
    var startDim = nodes.crossfilter.dimension(function(d) { return d.start || 0; }),
        startGroup = startDim.group();


    $("#time-range").slider({
        range: true,
        min: min,
        max: max,
        values: [begin, end],
        slide: function( event, ui ) {
            begin = ui.values[0];
            end = ui.values[1];
            do_status();
        }
    });
    $('#qfs-constraints').change(function(val) {
        do_qfs = $(this).is(':checked');
        diagram.lengthStrategy(do_qfs ? 'none' : 'symmetric')
            .relayout();
        doRender = true;
        if(!runner.isRunning())
            run();
    });

    // do not brush too fast
    dc.constants.EVENT_DELAY = 100;

    runner.init();
});
