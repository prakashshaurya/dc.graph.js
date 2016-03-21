dc_graph.highlight_neighbors = function(highlightStroke, highlightStrokeWidth) {
    function draw_highlighted(chart, edge) {
        edge
            .attr('stroke-width', function(e) {
                return e.dcg_highlighted ?
                    highlightStrokeWidth :
                    param(chart.edgeStrokeWidth())(e);
            })
            .attr('stroke', function(e) {
                return e.dcg_highlighted ?
                    highlightStroke :
                    param(chart.edgeStroke())(e);
            });
    }

    function clear_all_highlights(chart, edge) {
        edge.each(function(e) {
            e.dcg_highlighted = false;
        });
        draw_highlighted(chart, edge);
    }

    function add_behavior(chart, node, edge) {
        node
            .on('mouseover.highlight-neighbors', function(d) {
                edge.each(function(e) {
                    e.dcg_highlighted = e.source === d || e.target === d;
                });
                draw_highlighted(chart, edge);
            })
            .on('mouseout.highlight-neighbors', function(d) {
                clear_all_highlights(chart, edge);
            });
    }

    function remove_behavior(chart, node, edge) {
        node
            .on('mouseover.highlight-neighbors', null)
            .on('mouseout.highlight-neighbors', null);
        clear_all_highlights(chart, edge);
    }

    return dc_graph.behavior('highlight-neighbors', {
        add_behavior: add_behavior,
        first: function(chart, node, edge) {
            clear_all_highlights(chart, edge);
        },
        rest: function(chart, node, edge) {
            draw_highlighted(chart, edge);
        },
        remove_behavior: function(chart, node, edge) {
            remove_behavior(chart, node, edge);
        }
    });
};
