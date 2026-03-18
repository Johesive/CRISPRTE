//
// main.js
//

// yeah, browser sniffing sucks, but there are browser-specific quirks to handle that are not a matter of feature detection
var ua = window.navigator.userAgent.toLowerCase();
var isIE = !!ua.match(/msie|trident\/7|edge/);
var isWinPhone = ua.indexOf('windows phone') !== -1;
var isIOS = !isWinPhone && !!ua.match(/ipad|iphone|ipod/);

// set the dimensions and margins of the graph
var width = 40
height = 40
margin = 80

// The radius of the pieplot is half the width or half the height (smallest one). I subtract a bit of margin.
var radius = Math.min(width, height) / 2 - margin
var data;
var mismatch_data;
var combination_data;
var pie_color;
var coverage;
var gids_set;
var selected_gids = new Set()
var combination_number;

var plotconfig = {
    margin: { top: 10, right: 30, bottom: 30, left: 60 },
    width: 512,
    height: 256,
    legendheight: 200,
    legendwidth: 80,
    legendmargin: { top: 10, right: 60, bottom: 10, left: 2 }
};

var godsnot_102 = ['#FFFF00',
'#1CE6FF',
'#FF34FF',
'#FF4A46',
'#008941',
'#006FA6',
'#A30059',
'#FFDBE5',
'#7A4900',
'#0000A6',
'#63FFAC',
'#B79762',
'#004D43',
'#8FB0FF',
'#997D87',
'#5A0007',
'#809693',
'#6A3A4C',
'#1B4400',
'#4FC601',
'#3B5DFF',
'#4A3B53',
'#FF2F80',
'#61615A',
'#BA0900',
'#6B7900',
'#00C2A0',
'#FFAA92',
'#FF90C9',
'#B903AA',
'#D16100',
'#DDEFFF',
'#000035',
'#7B4F4B',
'#A1C299',
'#300018',
'#0AA6D8',
'#013349',
'#00846F',
'#372101',
'#FFB500',
'#C2FFED',
'#A079BF',
'#CC0744',
'#C0B9B2',
'#C2FF99',
'#001E09',
'#00489C',
'#6F0062',
'#0CBD66',
'#EEC3FF',
'#456D75',
'#B77B68',
'#7A87A1',
'#788D66',
'#885578',
'#FAD09F',
'#FF8A9A',
'#D157A0',
'#BEC459',
'#456648',
'#0086ED',
'#886F4C',
'#34362D',
'#B4A8BD',
'#00A6AA',
'#452C2C',
'#636375',
'#A3C8C9',
'#FF913F',
'#938A81',
'#575329',
'#00FECF',
'#B05B6F',
'#8CD0FF',
'#3B9700',
'#04F757',
'#C8A1A1',
'#1E6E00',
'#7900D7',
'#A77500',
'#6367A9',
'#A05837',
'#6B002C',
'#772600',
'#D790FF',
'#9B9700',
'#549E79',
'#FFF69F',
'#201625',
'#72418F',
'#BC23FF',
'#99ADC0',
'#3A2465',
'#922329',
'#5B4534',
'#FDE8DC',
'#404E55',
'#0089A3',
'#CB7E98',
'#A4E804',
'#324E72'
]

function waitUntil(expr, f) {
    if (!expr()) {
        window.setTimeout(function () {waitUntil(expr, f)}, 100);
    } else {
        f();
    }
}

function createCountBar(target, style = plotconfig) {
    return d3.select(target)
        .append("div")
        // Container class to make it responsive.
        .classed("svg-container", true)
        .append("svg")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .classed("svg-content-responsive", true)
        .attr("class", "graph-svg-component")
        .attr("viewBox", [0, 0, style.width, style.height + style.margin.top + style.margin.bottom])
        .style('text-align', "center")
        .style('margin', "0 auto")
        .style('margin-top', "5rem")
        .append("g")
        .attr("transform", "translate(" + style.margin.left + "," + style.margin.top + ")");
}

function addCountBarData(
    target,
    svg,
    count,
    style,
    create_tooltip = false,
    tooltip = undefined
) {
    var max = 0;
    Object.values(count).map(d => { if (d > max) max = d; })
    var y = d3.scaleLinear().domain([0, max]).range([(style.height + style.margin.top + style.margin.bottom) * 0.5, 0])
    var names = Array.from(Object.keys(count));
    var x = d3.scaleBand().range([0, style.width / 2]).domain(names)
    var color_scale = d3.scaleOrdinal(godsnot_102).domain(names)
    if (create_tooltip) {
        var tooltip = createTooltip(target)
    }
    svg.append("g")
        .call(d3.axisLeft(y)
            .ticks(5).tickSizeOuter(1))
        .style("font-size", "12pt");
    svg.append("g")
        .attr("transform", "translate(0," + (style.height + style.margin.top + style.margin.bottom) * 0.5 + ")")
        .call(d3.axisBottom(x)).attr("dx", 100)
        .selectAll("text").attr("y", 0)
        .attr("x", 9)
        .attr("dy", ".35em")
        .attr("transform", "rotate(90)")
        .style("text-anchor", "start")
        .style('font-size', '10pt')


    count = Object.entries(count).map(d => ({ name: d[0], value: d[1] }));
    svg.selectAll("bar")
        .data(count).enter()
        .append("rect").style("cursor", "pointer")
        .attr("class", "bar-rect")
        .attr("x", function(d) { return x(d.name) + (5 * (13 / names.length)) })
        .attr("y", function(d) { return y(d.value) })
        .attr("height", function(d) { return (style.height + style.margin.top + style.margin.bottom) * .5 - y(d.value); })
        .attr("width", (style.width / 2) / (2.5 * names.length))
        .attr("fill", d => "#A7A7A7")
        .on("mouseover", function(d, i) {
            tooltip.html("Target on " + i.name + ": " + i.value)
            tooltip.style('visibility', 'visible')
        })
        .on("mousemove", event => {
            tooltip
            .transition().duration(200)
                .style("left",  (event.pageX + 60) + "px")
                .style("opacity", 1)
                .style("top",   (event.pageY) + "px")
                
        }).on("mouseleave", function(d, i) {
            tooltip.transition().duration(200).style("opacity", 0)
        })

}

function CSVToArray(strData, strDelimiter) {
    strDelimiter = (strDelimiter || ",");
    var objPattern = new RegExp(("(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
        "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
        "([^\"\\" + strDelimiter + "\\r\\n]*))"), "gi");
    var arrData = [
        []
    ];
    var arrMatches = null;
    while (arrMatches = objPattern.exec(strData)) {
        var strMatchedDelimiter = arrMatches[1];


        if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) { arrData.push([]); }
        var strMatchedValue;
        if (arrMatches[2]) {
            strMatchedValue = arrMatches[2].replace(new RegExp("\"\"", "g"), "\"");
        } else { strMatchedValue = arrMatches[3]; }

        arrData[arrData.length - 1].push(strMatchedValue);
    }
    return (arrData);
}

function eqSet(as, bs) {
    if (as.size !== bs.size) return false;
    for (var a of as)
        if (!bs.has(a)) return false;
    return true;
}

function validCombinationGids(gs, gid) {
    result = new Set();
    for (var gids of gs) {
        if (Array.from(gid).every(d => gids.includes(d))) {
            for (var id of gids) {
                if (!Array.from(gid).includes(id)) {
                    result.add(id)
                }
            }
        }
    }
    return result;
}

function calculateGCContent(s) {
    var t = 0;
    var gc = 0;
    Array.from(s).map(function(c) {
        if (c == 'G' || c == 'C') {
            gc += 1;
        }
    })
    return (gc / 20 * 100).toFixed(2)
}

function createPie(target, color, data, create_tooltip=true, tooltip=undefined) {
    var total = Object.values(data).reduce((a, b) => a + b, 0).toString();
    var data = Object.entries(data).map(d => ({
        name: d[0],
        value: d[1]
    }))

    var color = color
        .range(d3.quantize(t => d3.interpolatePRGn(t * 0.8 + 0.1), data.length).reverse())

    var arc = d3.arc()
        .innerRadius(10)
        .outerRadius(Math.min(width, height) / 2 - 1)

    const radius = Math.min(width, height) / 2 * 0.8;
    var arcLabel = d3.arc().innerRadius(radius).outerRadius(radius);
    var pie = d3.pie()
        .sort(null)
        .value(d => d.value)

    const arcs = pie(data);

    const svg = d3.select(target).append("svg")
        .attr("viewBox", [-width, -height, width * 2, height * 2]);

    svg.append("g")
        .attr("stroke", "white")
        .attr("stroke-width", ".2pt")
        .selectAll("path")
        .data(arcs)
        .join("path")
        .attr("fill", d => color(d.data.name))
        .attr("d", arc)
        .transition()
        .duration(2000)
    if (create_tooltip) {
        var pie_tooltip = createTooltip(target);
    } else if (tooltip !== undefined) {
        var pie_tooltip = tooltip
    }
    var sum = Object.values(data).map(d => d.value).reduce((a, b) => a + b, 0);

    if (!create_tooltip) {
        var l = $(target).offset().left;
        var t = $(target).offset().top;
        svg.selectAll("path")
            .on("mouseover", function(d, i) {
                pie_tooltip.html(`${i.data.name}: ${i.data.value.toLocaleString()}` + " (" + (100 * i.data.value / sum).toFixed(2) + "%)");
                pie_tooltip.style('visibility', 'visible')
            })
            .on("mousemove", event => {
                pie_tooltip
                .transition().duration(200)
                    .style("left",  (event.pageX + 60) + "px")
                    .style("opacity", 1)
                    .style("top",   (event.pageY) + "px")
                    
            }).on("mouseleave", function(d, i) {
                pie_tooltip.transition().duration(200).style("opacity", 0)
            })
    } else {
        svg.selectAll("path").on("mouseover", function(d, i) {
            d3.select(this).transition()
                .duration('100')
                .attr("stroke-width", ".1pt")
            
            pie_tooltip.transition()
                .duration(200)
                .style("opacity", 1)
                .style("top", (d.offsetY - 5) + "px")
                .style("left", (d.offsetX + 20) + "px")
                
            pie_tooltip.html(`${i.data.name}: ${i.data.value.toLocaleString()}` + " (" + (100 * i.data.value / sum).toFixed(2) + "%)");
        })
        svg.selectAll("path").on("mouseout", function(d, i) {
            d3.select(this).transition()
                .duration('100')
                .attr("stroke-width", ".2pt")
            pie_tooltip.transition()
                .duration(200).style("opacity", 0);
        })
    }

    svg.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 0)
        .attr("text-anchor", "middle")
        .selectAll("text")
        .data(arcs)
        .join("text")
        .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
        .call(text => text.append("tspan")
            .attr("y", "-0.4em")
            .attr("font-weight", "bold")
            .text(d => d.data.name))
        .call(text => text.filter(d => (d.endAngle - d.startAngle) > 0.25).append("tspan")
            .attr("x", 0)
            .attr("y", "0.7em")
            .attr("fill-opacity", 0.7)
            .text(d => d.data.value.toLocaleString()));

    svg.append("text")
        .attr('x', -8)
        .attr('y', 0)
        .text("Total = " + total)
        .attr("fill", "black")
        .style("font-size", "2pt")
        .style("font-weight", 900);
}

function createTooltip(target) {
    var tooltip = d3.select(target).append("div")
        .attr("class", "hov-tooltip")
        .style("opacity", 0)
        .style('z-index', '1000')
    return tooltip
}


function getQueryParams(qs) {
    qs = qs.split("?")[1].split('+').join(' ');

    var params = {},
        tokens,
        re = /[?&]?([^=]+)=([^&]*)/g;

    while (tokens = re.exec(qs)) {
        params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
    }

    return params;
}

function unzip(data) {
    var res = '';
    var array = new Uint16Array(pako.ungzip(atob(decodeURIComponent(data)).split('').map(function(x) { return x.charCodeAt(0); })))
    var chunk = 8 * 1024;
    for (i = 0; i < array.length / chunk; i++) {
        res += String.fromCharCode.apply(null, array.slice(i * chunk, (i + 1) * chunk));
    }
    res += String.fromCharCode.apply(null, array.slice(i * chunk));
    return res
}

// var params = getQueryParams(document.location.href)
function scrollLog(log) {
    var container = $(log);
    var inners = Array.from($(log).find("small"))
    var inner = $(inners[inners.length - 1])
    container.animate({
        scrollTop: inner.offset().top - container.offset().top + container.scrollTop()
    });
}

function scrollPage(anchor) {
    $('html, body').animate({
        scrollTop: $(anchor).offset().top
    }, 2000);
}

function applyHighlights1(text) {
    text = text
        .replace(/\n$/g, '\n\n')
        .replace(/[A-Z]{20}\,/g, (match) => {
            return '<mark style="background-color: #b1d5e5;">' + match.slice(0,20) + '</mark>,';
        })
        .replace(/\,[A-Z]{20}$/, (match) => {
            return ',<mark style="background-color: #b1d5e5;">' + match.slice(1,21) + '</mark>';
        });

    if (isIE) {
        // IE wraps whitespace differently in a div vs textarea, this fixes it
        text = text.replace(/ /g, ' <wbr>');
    }

    return text;
}


function applyHighlights2(text) {
    text = text
        .replace(/\n$/g, '\n\n')
        .replace(/[A-Z]{20}[ATCG]GG/g, '<mark style="background-color: #b1d5e5;">$&</mark>')
        .replace(/CC[ATCG][A-Z]{20}/g, '<mark style="background-color: #B079AD;">$&</mark>');

    if (isIE) {
        // IE wraps whitespace differently in a div vs textarea, this fixes it
        text = text.replace(/ /g, ' <wbr>');
    }

    return text;
}

function handleSequenceInput1() {
    var text = $("#gseq").val();
    var highlightedText = applyHighlights1(text);
    $(".highlights").html(highlightedText);
    $(".backdrop").css({
        left: $("#gseq").position().left,
        top: $("#gseq").position().top + $("#gseq").innerHeight()
    })
}

function handleSequenceInput2() {
    var text = $("#gseq").val();
    var highlightedText = applyHighlights2(text);
    $(".highlights").html(highlightedText);
    $(".backdrop").css({
        left: $("#gseq").position().left,
        top: $("#gseq").position().top + $("#gseq").innerHeight()
    })
}



function handleScroll() {
    var scrollTop = $("#gseq").scrollTop();
    $(".backdrop").scrollTop(scrollTop);
}


function complement(a) {
    return { A: 'T', T: 'A', G: 'C', C: 'G' }[a];
}

function reverseComplement(sequence) {
    return sequence.split('').reverse().map(complement).join('');
}


var data;
var valid_combination_te = {"hg38": undefined, "mm10": undefined};
var valid_combination_te_initialized = false;
var table1_initialized = false;
var table1_5_initialized = false;
var table2_initialized = false;
var table3_initialized = false;



$(document).ready(function() {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://www.crisprte.cn/api/v3", true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
        "key": "validCombinationTE",
        "ga": "hg38",
    }));
    xhr.onload = function() {
        valid_combination_te["hg38"] = JSON.parse(decodeURIComponent(unzip(this.responseText)));
    }
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://www.crisprte.cn/api/v3", true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
        "key": "validCombinationTE",
        "ga": "mm10",
    }));
    xhr.onload = function() {
        valid_combination_te["mm10"] = JSON.parse(decodeURIComponent(unzip(this.responseText)));
    }

    $("#te-combination-select").on("mouseover", function(d) {
        $("#picker").addClass("hidden")
    })

    $('#for').on("change", function(d) {
        if ($('#for').val() == '1') {
                $("#te-col-1").removeClass("hidden")
                $("#te-col-2").addClass("hidden")
                $("#te-col-3").addClass("hidden")
                $("#main-datatable-3").addClass("hidden")
                $("#gseq-detail").addClass("hidden")
        } else if ($('#for').val() == '2') {
                $("#te-col-1").addClass("hidden")
                $("#te-col-2").removeClass("hidden")
                $("#te-col-3").addClass("hidden")
                $("#main-datatable-1").addClass("hidden")
                $("#detail").addClass("hidden")
             
                $("#te-menu").empty();
                    valid_combination_te[$("#ga").val()].map(function(d) {
                        $("#te-menu").append('<div class="item" data-value=' + d + '>' + d + '</div>');
                })
                valid_combination_te_initialized = true;
                

                

        } else if ($('#for').val() == '3') {
            $("#te-col-1").addClass("hidden")
            $("#te-col-2").addClass("hidden")
            $("#te-col-3").removeClass("hidden")

        }
    });
    waitUntil(() => valid_combination_te['hg38'] !== undefined, () => {
        $("#te-menu-search-subfamily").empty();
        valid_combination_te[$("#search-subfamily-ga").val()].map(function(d) {
            $("#te-menu-search-subfamily").append('<div class="item" data-value=' + d + '>' + d + '</div>');
        })
    })
    $("#ga").on("change", function(d) {
        $("#te-menu").empty();

        valid_combination_te[$("#ga").val()].map(function(d) {
            $("#te-menu").append('<div class="item" data-value=' + d + '>' + d + '</div>');
        })
        valid_combination_te_initialized = true;
        valid_combination_te_initialized = true;
    });

    $("#search-subfamily-ga").on("change", function(d) {
        $("#te-menu-search-subfamily").empty();

        valid_combination_te[$("#search-subfamily-ga").val()].map(function(d) {
            $("#te-menu-search-subfamily").append('<div class="item" data-value=' + d + '>' + d + '</div>');
        })
    });

    $("#gseq").each(function() {}).on("input", function() {
        // this.style.height = "auto";
        // this.style.height = (this.scrollHeight) + "px";
        $("#gseq").val($("#gseq").val().replace(/\n/g, ''));
    });

    $("#gseq").find('*').off();
    $("#gseq").on({
        'input': handleSequenceInput1,
        'scroll': handleScroll
    });
    $("#seq-for").on("change", function() {
        if ($("#seq-for").val() == "1") {
            $("#gseq").each(function() {}).on("input", function() {
                // this.style.height = "auto";
                // this.style.height = (this.scrollHeight) + "px";
                $("#gseq").val($("#gseq").val().replace(/\n/g, ''));
            });

            $("#gseq").find('*').off();
            $("#gseq").on({
                'input': handleSequenceInput1,
                'scroll': handleScroll
            });
        } else {
            $("#gseq").each(function() {}).on("input", function() {
                // this.style.height = "auto";
                // this.style.height = (this.scrollHeight) + "px";
                $("#gseq").val($("#gseq").val().replace(/\n/g, ''));
            });
            $("#gseq").find('*').off();
            $("#gseq").on({
                'input': handleSequenceInput2,
                'scroll': handleScroll
            });
        }
        $("#gseq").highlightWithinTextarea('update');
    })


    $('#advanced-features-btn').on('click', function() {
        if ($('#advanced-features-btn').find(".btn-inner--text").text().includes("sequence")) {
            $('#advanced-features').removeClass("hidden");
            $('#basic-features').addClass("hidden");
            $('#advanced-features-btn').find(".btn-inner--text").text("Search for TE subfamily")
            if (table2_initialized) {
                $('#dataTable-2').DataTable().clear().destroy()
                table2_initialized = false;
                $("#mm0-2").empty()
                $("#mm1-2").empty()
                $("#mm2-2").empty()
                $("#mm3-2").empty()
            }
            $("#main-datatable-1").addClass("hidden")
            $("#main-datatable-3").addClass("hidden")

        } else {
            $('#advanced-features').addClass("hidden");
            $('#basic-features').removeClass("hidden");
            $("#gseq-detail").addClass("hidden");
            $('#advanced-features-btn').find(".btn-inner--text").text("Search for sequence")
        }
    })
    $("#search-subfamily").on("click", function() {
        $("#datatable-search-wrapper").removeClass("hidden")
        $('#dataTable-search').DataTable().clear().destroy()
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "https://www.crisprte.cn/api/v3", true);
        xhr.setRequestHeader('Content-Type', 'application/json');

        xhr.send(JSON.stringify({
            "key": "getGtfByTeName",
            "te_name": $("#te-search-subfamily").val(),
            "ga": $("#search-subfamily-ga").val()
        }));
        xhr.onload = function() {
            data = JSON.parse(decodeURIComponent(unzip(this.responseText)))
            data.forEach(d => {
                $("#search-table-body").append("<tr class='search-result-row'>" +
                "<td>" + d['seqname'] + "</td>" +
                "<td>" + d['start'] + "</td>" +
                "<td>" + d['end'] + "</td>" +
                "<td>" + d['gene_id'] + "</td>" +
                "<td>" + d['name'].replaceAll("dup","copy") + "</td>" +
                " </tr>")
            })
            $('#dataTable-search').DataTable({
                dom: 'Bfrtip',
                "lengthChange": false,
                "searching": false,
                buttons: [
                    'copyHtml5',
                    'excelHtml5',
                    'csvHtml5',
                    'pdfHtml5'
                ],
                'iDisplayLength': 10,
                // "aLengthMenu":[10, 50, 100]
            });
        }
    })

    $("#search").on("click", function() {
        $("#datatable-search-wrapper").removeClass("hidden")
        $('#dataTable-search').DataTable().clear().destroy()
        var coordinate_string = $("#search-coordinate").val()
        var chromosome = coordinate_string.split(":")[0]
        var start = coordinate_string.split(":")[1].split("-")[0]
        var end = coordinate_string.split(":")[1].split("-")[1]

        var xhr = new XMLHttpRequest();
        xhr.open("POST", "https://www.crisprte.cn/api/v3", true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({
            "key": "getGtfByRegion",
            "chrom": chromosome,
            "start": start,
            "end": end,
            "type": "te",
            "ga": $("#search-ga").val(),
            "source": "search"
        }));
        xhr.onload = function() {
            data = JSON.parse(decodeURIComponent(unzip(this.responseText)))
            data.forEach(d => {
                $("#search-table-body").append("<tr class='search-result-row'>" +
                "<td>" + d['seqname'] + "</td>" +
                "<td>" + d['start'] + "</td>" +
                "<td>" + d['end'] + "</td>" +
                "<td>" + d['gene_id'] + "</td>" +
                "<td>" + d['name'].replaceAll("dup","copy") + "</td>" +
                " </tr>")
            })
            $('#dataTable-search').DataTable({
                dom: 'Bfrtip',
                "lengthChange": false,
                "searching": false,
                buttons: [
                    'copyHtml5',
                    'excelHtml5',
                    'csvHtml5',
                    'pdfHtml5'
                ],
                'iDisplayLength': 2,
                // "aLengthMenu":[10, 50, 100]
            });
        }
    })

    $('#submit').on('click', function() {
        var xhr = new XMLHttpRequest();
        if ($('#advanced-features-btn').find(".btn-inner--text").text().includes("sequence")) {
            switch ($('#for').val()) {
                case '1':
                    $("#dataTable-1-log").removeClass("hidden")
                    $('#te').parent().find(".alert").empty()
                    $("#dataTable-1-log").empty()
                    var te = $('#te').val();
                    if (te == '') {
                        $('#te').parent().find(".alert").append("A TE duplicate name required")
                        return;
                    }

                    if (table1_initialized) {
                        $('#dataTable-1').DataTable().clear().destroy()
                    }
                    if (table2_initialized) {
                        $("#gseq-detail").addClass("hidden")
                    }
                    if (table3_initialized) {
                        $('#dataTable-3').DataTable().clear().destroy()
                        $("#main-datatable-3").addClass("hidden")
                    }
                    $("#dataTable-1-log").append("<small>Sending request to server</small><br>")
                    $("#main-datatable-1").removeClass("hidden")
                    $("#search-result-pannel-1").html("Search result for " + $('#te').val());

                    $("#detail").addClass("hidden");
                    xhr.open("POST", "https://www.crisprte.cn/api/v3", true);
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    xhr.send(JSON.stringify({
                        key: "getGRNAByTedup",
                        ga: $("#ga").val(),
                        te_dup: te
                    }));
                    scrollPage($("#data-table-anchor"))
                    $("#dataTable-1-log").append("<small>Finding valid gRNAs</small><br>")
                    scrollLog("#dataTable-1-log")
                    $("#dataTable-1-log").append("<small>Please wait 10 seconds for the results</small><br>")
                    scrollLog("#dataTable-1-log")
                    xhr.onload = function() {
                        $("#dataTable-1-log").append("<small>Receive byte stream from server</small><br>")
                        scrollLog("#dataTable-1-log")
                        $("#dataTable-1-log").append("<small>Decoding message </small><br>")
                        scrollLog("#dataTable-1-log")
                        mismatch_data = JSON.parse(decodeURIComponent(unzip(this.responseText)))
                        if (mismatch_data.err) {
                            $('#te').parent().find(".alert").append("Invalid TE name ")
                            scrollPage("#te")
                            return;
                        }
                        $("#dataTable-1-log").addClass("hidden")
                        morenos = Object.values(mismatch_data).map(d => d.moreno)
                        morenos_max = Math.max.apply(null, morenos)
                        morenos_min = Math.min.apply(null, morenos)
                        azimuths = Object.values(mismatch_data).map(d => d.azimuth)
                        azimuths_max = Math.max.apply(null, azimuths)
                        azimuths_min = Math.min.apply(null, azimuths)
                        Object.entries(mismatch_data).map(function(d) {
                            var mm0n = Object.values(d[1].mm0.class).reduce((a, b) => a + b, -1)
                            var mm1n = Object.values(d[1].mm1.class).reduce((a, b) => a + b, 0)
                            var mm2n = Object.values(d[1].mm2.class).reduce((a, b) => a + b, 0)
                            var mm3n = Object.values(d[1].mm3.class).reduce((a, b) => a + b, 0)
                            grna_chrom = d[1].pos.split("_")[0]
                            grna_start = d[1].pos.split("_")[1]
                            grna_end = d[1].pos.split("_")[2]
                            var pos = grna_chrom + ":" + grna_start + "-" + grna_end
                            var strand = d[1].pos[d[1].pos.length - 1]
                            var azimuth = parseFloat(d[1].azimuth).toFixed(2)
                            var moreno = parseFloat(d[1].moreno).toFixed(2)
                            var moreno_frac = Math.ceil(Math.ceil(((moreno - morenos_min) / (morenos_max - morenos_min)) * 100) / 8.3)
                            var azimuth_frac = Math.ceil(Math.ceil(((azimuth - azimuths_min) / (azimuths_max - azimuths_min)) * 100) / 8.3)
                            if (!(mm0n > 0 & mm1n == 0 & mm2n == 0 & mm3n == 0)) {
                                $("#main-tablebody-1").append("<tr class='result-row' id='row-" + d[0] + "'>" +
                                    "<td>" + d[1].gseq + "</td>" +
                                    "<td>" + pos + "</td>" +
                                    "<td>" + strand + "</td>" +
                                    "<td>" + calculateGCContent(d[1].gseq) + "%</td>" +
                                    "<td>" + mm0n + "</td>" +
                                    "<td>" + mm1n + "</td>" +
                                    "<td>" + mm2n + "</td>" +
                                    "<td>" + mm3n + "</td>" +
                                    "<td style='white-space:nowrap'>" + moreno + "<img src='https://www.crisprte.cn/static/img/svg/scales/" + moreno_frac + ".svg' style='width: 40pt;'>" + "</td>" +
                                    "<td style='white-space:nowrap'>" + azimuth + "<img src='https://www.crisprte.cn/static/img/svg/scales/" + azimuth_frac + ".svg' style='width: 40pt;'>" + "</td>" +
                                    // "<td>" + '' + "</td>" +
                                    "<td>" + parseFloat(d[1].score).toFixed(2) + "</td>" +
                                    " </tr>")
                            }
                        });
                        $('#dataTable-1').DataTable({
                            dom: 'Bfrtip',
                            "lengthChange": false,
                            "searching": false,
                            buttons: [
                                'copyHtml5',
                                'excelHtml5',
                                'csvHtml5',
                                'pdfHtml5'
                            ],
                            "fnDrawCallback": () => {
                                $("#main-datatable-1").find(".result-row").unbind("click");
                                $("#main-datatable-1").find(".result-row").on("click", function(d) {
                                    var d = mismatch_data[this.id.split("-")[1]]
                                    $(".detail-mm").empty();
                                    $("#grna-detail").empty();
                                    $("#grna-detail").append("<h1 style='font-family: Courier;color:black;font-size:35pt'>" + "<span style='color:#dcdcdc' id='upstream'>" + d.upstream + "</span>" + d.gseq + "<span style='color:red' id='pam'>" + d.pam + "</span>" + "<span style='color:#dcdcdc' id='downstream'>" + d.downstream + "</span>" + " </h1>")
                                    clearGenomeViz("#result-viewer");
                                    $("#detail").removeClass("hidden");
                                    grna_chrom = d.pos.split("_")[0]
                                    grna_start = d.pos.split("_")[1]
                                    grna_end = d.pos.split("_")[2]
                                    grna_strand = d.pos.split("_")[3]
                                    var xhr1 = new XMLHttpRequest();
                                    xhr1.open("POST", "https://www.crisprte.cn/api/v3", true);
                                    xhr1.setRequestHeader('Content-Type', 'application/json');
                                    xhr1.send(JSON.stringify({
                                        ga: $("#ga").val(),
                                        key: "getGtfByRegion",
                                        type: "all",
                                        chrom: grna_chrom,
                                        start: parseInt(grna_start) - 3000,
                                        end: parseInt(grna_end) + 3000,
                                        source: "viz"
                                    }));
                                    xhr1.onload = function() {
                                        genome_data = JSON.parse(decodeURIComponent(unzip(this.responseText)))
                                        genome_data.push({ start: parseInt(grna_start), end: parseInt(grna_end), feature: "grna", strand: grna_strand })
                                        createGenomeViz("#result-viewer", grna_chrom, parseInt(grna_start) - 3000, parseInt(grna_end) + 3000, genome_data);
                                    }
    
                                    var domain = Array.prototype.concat(Object.keys(d.mm0.raw), Object.keys(d.mm1.raw), Object.keys(d.mm1.raw), Object.keys(d.mm1.raw))
    
                                    pie_color = d3.scaleOrdinal(godsnot_102)
                                        .domain(domain)
    
                                    createPie("#mm0", pie_color, d.mm0.raw);
                                    createPie("#mm1", pie_color, d.mm1.raw);
                                    createPie("#mm2", pie_color, d.mm2.raw);
                                    createPie("#mm3", pie_color, d.mm3.raw);
    
                                    var sum = Object.values(d.mm0.class).reduce((a, b) => a + b, 0);
                                    Object.entries(d.mm0.class).map(d => $("#mm0").append("<tr>" + "<td style='font-family:arial;font-weight:600'><b>" + d[0] + " </b></td><td>" + d[1] + " (" + (100 * d[1] / sum).toFixed(2) + "%)</td></tr>"))
                                    var sum = Object.values(d.mm1.class).reduce((a, b) => a + b, 0);
                                    Object.entries(d.mm1.class).map(d => $("#mm1").append("<tr>" + "<td style='font-family:arial;font-weight:600'><b>" + d[0] + " </b></td><td>" + d[1] + " (" + (100 * d[1] / sum).toFixed(2) + "%)</td></tr>"))
                                    var sum = Object.values(d.mm2.class).reduce((a, b) => a + b, 0);
                                    Object.entries(d.mm2.class).map(d => $("#mm2").append("<tr>" + "<td style='font-family:arial;font-weight:600'><b>" + d[0] + " </b></td><td>" + d[1] + " (" + (100 * d[1] / sum).toFixed(2) + "%)</td></tr>"))
                                    var sum = Object.values(d.mm3.class).reduce((a, b) => a + b, 0);
                                    Object.entries(d.mm3.class).map(d => $("#mm3").append("<tr>" + "<td style='font-family:arial;font-weight:600'><b>" + d[0] + " </b></td><td>" + d[1] + " (" + (100 * d[1] / sum).toFixed(2) + "%)</td></tr>"))
                                    var xhr2 = new XMLHttpRequest();
                                    xhr2.open("POST", "https://www.crisprte.cn/api/v3", true);
                                    xhr2.setRequestHeader('Content-Type', 'application/json');
                                    xhr2.send(JSON.stringify({
                                        key: "getMismatchBedGseq",
                                        ga: $("#ga").val(),
                                        gseq: d.gseq
                                    }));
                                    xhr2.onload = function() {
                                        data = JSON.parse(decodeURIComponent(unzip(this.responseText)))
                                        Object.entries(data).map(function(d) {
                                            var mm = d[0];
                                            var info_csv = CSVToArray(d[1], '\t');
                                            data[mm] = info_csv;
                                            
                                            $("#main-datatable-1-5").removeClass("hidden")
                                        })
                                        if (table1_5_initialized) {
                                            $('#dataTable-1-5').DataTable().clear().destroy()
                                            table1_5_initialized = false;
                                        }
                                        $("#dataTable-1-5-select-dropdown").unbind("change")
                                        data["mm0"].map(function(y) {
                                            if (y[0]) {
                                            $("#main-tablebody-1-5").append("<tr class='result-row' id='row-" + '?' + "'>" +
                                                    "<td>" + y[0] + "</td>" +
                                                    "<td>" + y[1] + "</td>" +
                                                    "<td>" + y[2] + "</td>" +
                                                    "<td>" + y[3] + "</td>" +
                                                    "<td>" + y[6] + "</td>" +
                                                    "<td>" + y[7].replaceAll("dup","copy")  + "</td>"  + " </tr>")
                                            }
                                        })
                                        $(Array.from($($("#dataTable-1-5-select-dropdown").parent()).find(".item"))[0]).click()
                                        $('#dataTable-1-5').DataTable({
                                            dom: 'Bfrtip',
                                            "lengthChange": false,
                                            "searching": false,
                                            buttons: [
                                                'copyHtml5',
                                                'excelHtml5',
                                                'csvHtml5',
                                                'pdfHtml5'
                                            ],
                                            'iDisplayLength': 30,
                                            // "aLengthMenu":[10, 50, 100]
                                        });
                                        table1_5_initialized = true;
    
                                        $("#dataTable-1-5-select-dropdown").on("change", function(d) {
                                            var mm = $("#dataTable-1-5-select-dropdown").val()
                                            if (table1_5_initialized) {
                                                $('#dataTable-1-5').DataTable().clear().destroy()
                                                table1_5_initialized = false;
                                            }
                                            data["mm" + mm].map(function(y) {
                                                if (y[0]) {
                                                $("#main-tablebody-1-5").append("<tr class='result-row' id='row-" + '?' + "'>" +
                                                        "<td>" + y[0] + "</td>" +
                                                        "<td>" + y[1] + "</td>" +
                                                        "<td>" + y[2] + "</td>" +
                                                        "<td>" + y[3] + "</td>" +
                                                        "<td>" + y[6] + "</td>" +
                                                        "<td>" + y[7].replaceAll("dup","copy") + "</td>"  + " </tr>")
                                                }
                                            })
                                            $('#dataTable-1-5').DataTable({
                                                dom: 'Bfrtip',
                                                "lengthChange": false,
                                                "searching": false,
                                                buttons: [
                                                    'copyHtml5',
                                                    'excelHtml5',
                                                    'csvHtml5',
                                                    'pdfHtml5'
                                                ],
                                                'iDisplayLength': 30,
                                                // "aLengthMenu":[10, 50, 100]
                                            });
                                            table1_5_initialized = true;
                                        })
                                    }
                            })
                            },
                            'iDisplayLength': 15,
                            // "aLengthMenu":[10, 50, 100]
                        });
                        table1_initialized = true;
                    }
                    break;
                case '2':
                    var te = $('#te-combination-select').val();
                    if (table3_initialized) {
                        $('#dataTable-3').DataTable().clear().destroy()
                    }
                    if (table2_initialized) {
                        $("#gseq-detail").addClass("hidden")
                    }
                    $("#main-datatable-3").removeClass("hidden")
                    $("#search-result-pannel-3").html("Search result of sgRNAs combination targeting " + $("#te-combination-select").val())
                    xhr.open("POST", "https://www.crisprte.cn/api/v3", true);
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    xhr.send(JSON.stringify({
                        ga: $("#ga").val(),
                        key: "getGRNACombinationByTeclass",
                        te_class: te
                    }));
                    scrollPage("#data-table-anchor");
                    xhr.onload = function() {
                        combination_data = JSON.parse(decodeURIComponent(unzip(this.responseText)));
                        if (combination_data.err) {
                            $('#te').parent().find("small").append("Invalid TE name ")
                            scrollPage("#te")
                            return;
                        }
                        var table_tooltip = createTooltip("body")
                        table_tooltip.attr("class", "d3tooltip")
                        Object.entries(combination_data).map(function(d) {
                            gseqs = JSON.parse(d[0])
                            $("#main-tablebody-3").append("<tr class='result-row' id='row-" + d[0] + "'>" +
                            "<td>" + "<p>" + gseqs[0] + "</p>" +
                                     "<p>" + gseqs[1] + "</p>" +
                                     "<p>" + gseqs[2] + "</p>" +
                            "</td>" +
                            "<td>" + d[1]["on_target"] + "</td>" +
                            "<td>" + d[1]["on_target_percentage"].toPrecision(3) + "%</td>" +
                            "<td id='combined-" + JSON.parse(d[0]).join('-') + "'></td>" +
                            // Append the svg of off_target_te of d[1]["off_target_te"]
                            "<td id='offtarget1-" + JSON.parse(d[0]).join('-') + "'></td>" +
                            // Append the svg of off_target genes
                            // "<td>" + d[1]["off_target"] + "</td>" +
                            "<td id='offtarget2-" + JSON.parse(d[0]).join('-') + "'></td>" +
                            " </tr>")
                            var combined = Object.fromEntries(Object.entries(JSON.parse(d[1]["off_target_te"].replaceAll("'",'"'))).sort((a, b) => b[1] - a[1]).slice(0,5));
                            combined[$("#te-combination-select").val()] = d[1]['on_target']
                            createPie(
                                "#combined-" + JSON.parse(d[0]).join('-'),
                                d3.scaleOrdinal(godsnot_102).domain(Array.from(Object.keys(combined))),
                                combined,
                                false,
                                table_tooltip
                            )
                            if (Object.values(JSON.parse(d[1]["off_target_te"].replaceAll("'",'"'))).length > 0) {
                                var svg1 = createCountBar("#offtarget1-" + JSON.parse(d[0]).join('-'));
                                addCountBarData(
                                    "#offtarget1-" + JSON.parse(d[0]).join('-'),
                                    svg1,
                                    Object.fromEntries(Object.entries(JSON.parse(d[1]["off_target_te"].replaceAll("'",'"'))).sort((a, b) => b[1] - a[1]).slice(0,5)),
                                    plotconfig,
                                    false,
                                    table_tooltip
                                )
                            }

                            if (Object.values(JSON.parse(d[1]["off_target"].replaceAll("'",'"'))).length > 0) {
                                var svg2 = createCountBar("#offtarget2-" + JSON.parse(d[0]).join('-'));
                                addCountBarData(
                                    "#offtarget2-" + JSON.parse(d[0]).join('-'),
                                    svg2,
                                    Object.fromEntries(Object.entries(JSON.parse(d[1]["off_target"].replaceAll("'",'"'))).sort((a, b) => b[1] - a[1]).slice(0,5)),
                                    plotconfig,
                                    false,
                                    table_tooltip
                                )
                            }
                        })
                        
                        $('#dataTable-3').DataTable({
                            dom: 'Bfrtip',
                            "lengthChange": false,
                            "searching": false,
                            "fnDrawCallback": () => {
                                $("#main-datatable-3").find(".result-row").unbind("click");
                                $("#main-datatable-3").find(".result-row").on("click", function(d) {
                                    if (table2_initialized) {
                                        $('#dataTable-2').DataTable().clear().destroy()
                                        $("#dataTable-2-select-dropdown").html("<option></option>");
                                        table2_initialized = false;
                                        $("#mm0-2").empty()
                                        $("#mm1-2").empty()
                                        $("#mm2-2").empty()
                                        $("#mm3-2").empty()
                                    }
                                    $("#dataTable-2-select-dropdown").unbind("change");
                                    var d = this.id.split("-")[1];
                                    gseqs = JSON.parse(d);
                                    $("#dataTable-2-select-dropdown").append("<option value=''></option>");
                                    gseqs.forEach(gseq => {
                                        $("#dataTable-2-select-dropdown").append("<option value='" + gseq + "'>" + gseq + "</option>");
                                    })
                                    var xhr2 = new XMLHttpRequest();
                                    xhr2.open("POST", "https://www.crisprte.cn/api/v3", true);
                                    xhr2.setRequestHeader('Content-Type', 'application/json');
                                    xhr2.send(JSON.stringify({
                                        key: "getMismatchBedGseq",
                                        ga: $("#ga").val(),
                                        gseqs: gseqs
                                    }));
                                    xhr2.onload = function() {

                                        scrollPage("#gseq-detail-anchor");
                                        
                                        data = JSON.parse(decodeURIComponent(unzip(this.responseText)))
                                        if (data.err) {
                                            $('#te').parent().find(".alert").append("Invalid TE name ")
                                            scrollPage("#te")
                                            return;
                                        }
                                        Object.entries(data).map(function(d) {
                                            var gseq = d[0];
                                            var gid = d[1].gid;
                                            Array.from(["mm0","mm1","mm2","mm3"]).map(mm => {
                                                var info_csv = CSVToArray(d[1][mm]["target"], '\t');
                                                data[gseq][mm]["target"] = info_csv;
                
                                            })
                                            
                                        })
                                        $("#gseq-detail").removeClass("hidden")
                                        if (table1_initialized) {
                                            $("#main-datatable-1").addClass("hidden")
                                            $("#detail").addClass("hidden");
                                        }
                                        
                                        $("#dataTable-2-select-dropdown").on("change", function(d) {
                                            gseq = $("#dataTable-2-select-dropdown").val();
                                            if (table2_initialized) {
                                                $("#mm0-2").empty()
                                                $("#mm1-2").empty()
                                                $("#mm2-2").empty()
                                                $("#mm3-2").empty()
                                            }
        
                                            
                                            
                                            var domain = Array.prototype.concat(Object.keys(data[gseq]["mm0"]["raw"]), Object.keys(data[gseq]["mm1"]["raw"]), Object.keys(data[gseq]["mm2"]["raw"]), Object.keys(data[gseq]["mm3"]["raw"]))
                        
                                            pie_color = d3.scaleOrdinal(godsnot_102).domain(domain)
                                    
                                            createPie("#mm0-2", pie_color, data[gseq]["mm0"]["raw"]);
                                            createPie("#mm1-2", pie_color, data[gseq]["mm1"]["raw"]);
                                            createPie("#mm2-2", pie_color, data[gseq]["mm2"]["raw"]);
                                            createPie("#mm3-2", pie_color, data[gseq]["mm3"]["raw"]);
                                        })
                        
                                        $("#dataTable-2-select-dropdown, #dataTable-2-select-mm").on("change", function(d) {
        
                                            gseq = $("#dataTable-2-select-dropdown").val();
                                                if (table2_initialized) {
                                                    $('#dataTable-2').DataTable().clear().destroy()
                                                    table2_initialized = false;
                                                }
                                                // default is mm0 prefect mismatch
                                                var mm = $("#dataTable-2-select-mm").val();
                                                data[gseq]["mm" + mm]["target"].map(function(y) {
        
                                                    if (y[0]) {
                                                        $("#main-tablebody-2").append("<tr class='result-row' id='row-" + gseq + "'>" +
                                                                "<td>" + y[0] + "</td>" +
                                                                "<td>" + y[1] + "</td>" +
                                                                "<td>" + y[2] + "</td>" +
                                                                "<td>" + y[3] + "</td>" +
                                                                "<td>" + y[6] + "</td>" +
                                                                "<td>" + y[7].replaceAll("dup","copy") + "</td>"  + " </tr>")
                                                    }
                                                })
                                                $('#dataTable-2').DataTable({
                                                    dom: 'Bfrtip',
                                                    "lengthChange": false,
                                                    "searching": false,
                                                    buttons: [
                                                        'copyHtml5',
                                                        'excelHtml5',
                                                        'csvHtml5',
                                                        'pdfHtml5'
                                                    ],
                                                    'iDisplayLength': 15,
                                                    // "aLengthMenu":[10, 50, 100]
                                                });
                                                table2_initialized = true;
                                            }
                                        )
                                        waitUntil(() => Array.from($($("#dataTable-2-select-dropdown").parent()).find(".item")).length > 0, () => {
                                            $(Array.from($($("#dataTable-2-select-dropdown").parent()).find(".item"))[0]).click();
                                        })  
                                    }
                                })
                            },
                            buttons: [
                                'copyHtml5',
                                'excelHtml5',
                                'csvHtml5',
                                'pdfHtml5'
                            ],
                            'iDisplayLength': 5,
                            // "aLengthMenu":[10, 50, 100]
                        });
                        table3_initialized = true;

                    }   
                    break;
                case '3':
                    {
                        /** 20231220 */
                        $("#dataTable-1-log").removeClass("hidden")
                        $('#te').parent().find(".alert").empty()
                        $("#dataTable-1-log").empty()
                        $("#dataTable-1-log").append("<small>Sending request to server</small><br>")


                        $("#datatable-search-wrapper").removeClass("hidden")
                        $('#dataTable-search').DataTable().clear().destroy()
                        $('#dataTable-1').DataTable().clear().destroy()

                        var coordinate_string = $("#coordinate-menu").val()
                        var chromosome = coordinate_string.split(":")[0]
                        var start = coordinate_string.split(":")[1].split("-")[0]
                        var end = coordinate_string.split(":")[1].split("-")[1]



                        var xhr = new XMLHttpRequest();
                        xhr.open("POST", "https://www.crisprte.cn/api/v3", false);
                        xhr.setRequestHeader('Content-Type', 'application/json');
                        xhr.send(JSON.stringify({
                            "key": "getGtfByRegion",
                            "chrom": chromosome,
                            "start": start,
                            "end": end,
                            "type": "te",
                            "ga": $("#search-ga").val(),
                            "source": "design"
                        }));

                        
                        scrollPage($("#data-table-anchor"))
                        $("#dataTable-1-log").append("<small>Finding valid gRNAs</small><br>")
                        scrollLog("#dataTable-1-log")
                        $("#dataTable-1-log").append("<small>Please wait 10 seconds for the results</small><br>")
                        scrollLog("#dataTable-1-log")

                        if (xhr.status == 200) {
                            data = JSON.parse(decodeURIComponent(unzip(xhr.responseText)))
                            data.forEach(d => {
                                $("#search-table-body").append("<tr class='search-result-row'>" +
                                "<td>" + d['seqname'] + "</td>" +
                                "<td>" + d['start'] + "</td>" +
                                "<td>" + d['end'] + "</td>" +
                                "<td>" + d['gene_id'] + "</td>" +
                                "<td>" + d['name'].replaceAll("dup","copy") + "</td>" +
                                " </tr>")
                            })
                            $('#dataTable-search').DataTable({
                                dom: 'Bfrtip',
                                "lengthChange": false,
                                "searching": false,
                                buttons: [
                                    'copyHtml5',
                                    'excelHtml5',
                                    'csvHtml5',
                                    'pdfHtml5'
                                ],
                                'iDisplayLength': 2,
                                // "aLengthMenu":[10, 50, 100]
                            });
                            var all_te_duplicates = data.map(d => d['name'])
                            if (all_te_duplicates.length > 3) {
                                alert("Too many TEs in the selected range!");
                                return 
                            }
                            all_mismatch_data = {}
                            all_te_duplicates.map(te => {
                                $("#dataTable-1-log").removeClass("hidden")
                                $('#te').parent().find(".alert").empty()
                                $("#dataTable-1-log").empty()
                            
                                if (table1_initialized) {
                                    $('#dataTable-1').DataTable().clear().destroy()
                                }
                                if (table2_initialized) {
                                    $("#gseq-detail").addClass("hidden")
                                }
                                if (table3_initialized) {
                                    $('#dataTable-3').DataTable().clear().destroy()
                                    $("#main-datatable-3").addClass("hidden")
                                }
                                $("#dataTable-1-log").append("<small>Sending request to server</small><br>")
                                $("#main-datatable-1").removeClass("hidden")
                                $("#search-result-pannel-1").html("Search result for " + $('#te').val());
                            
                                $("#detail").addClass("hidden");

                                var xhr1 = new XMLHttpRequest();
                                xhr1.open("POST", "https://www.crisprte.cn/api/v3", false);
                                xhr1.setRequestHeader('Content-Type', 'application/json');
                                xhr1.send(JSON.stringify({
                                    key: "getGRNAByTedup",
                                    ga: $("#ga").val(),
                                    te_dup: te
                                }));
                                scrollPage($("#data-table-anchor"))
                                $("#dataTable-1-log").append("<small>Finding valid gRNAs</small><br>")
                                scrollLog("#dataTable-1-log")
                                $("#dataTable-1-log").append("<small>Please wait 10 seconds for the results</small><br>")
                                scrollLog("#dataTable-1-log")
                                if (xhr1.status == 200) {
                                    $("#dataTable-1-log").append("<small>Receive byte stream from server</small><br>")
                                    scrollLog("#dataTable-1-log")
                                    $("#dataTable-1-log").append("<small>Decoding message </small><br>")
                                    scrollLog("#dataTable-1-log")
                                    mismatch_data = JSON.parse(decodeURIComponent(unzip(xhr1.responseText)))
                                    if (mismatch_data.err) {
                                        $('#te').parent().find(".alert").append("Invalid TE name ")
                                        scrollPage("#te")
                                        return;
                                    }
                                    all_mismatch_data = {...all_mismatch_data,...mismatch_data}
                                }
                            })
                            {
                                $("#dataTable-1-log").addClass("hidden")
                                morenos = Object.values(all_mismatch_data).map(d => d.moreno)
                                morenos_max = Math.max.apply(null, morenos)
                                morenos_min = Math.min.apply(null, morenos)
                                azimuths = Object.values(all_mismatch_data).map(d => d.azimuth)
                                azimuths_max = Math.max.apply(null, azimuths)
                                azimuths_min = Math.min.apply(null, azimuths)
                                Object.entries(all_mismatch_data).map(function(d) {
                                    var mm0n = Object.values(d[1].mm0.class).reduce((a, b) => a + b, -1)
                                    var mm1n = Object.values(d[1].mm1.class).reduce((a, b) => a + b, 0)
                                    var mm2n = Object.values(d[1].mm2.class).reduce((a, b) => a + b, 0)
                                    var mm3n = Object.values(d[1].mm3.class).reduce((a, b) => a + b, 0)
                                    grna_chrom = d[1].pos.split("_")[0]
                                    grna_start = d[1].pos.split("_")[1]
                                    grna_end = d[1].pos.split("_")[2]
                                    var pos = grna_chrom + ":" + grna_start + "-" + grna_end
                                    var strand = d[1].pos[d[1].pos.length - 1]
                                    var azimuth = parseFloat(d[1].azimuth).toFixed(2)
                                    var moreno = parseFloat(d[1].moreno).toFixed(2)
                                    var moreno_frac = Math.ceil(Math.ceil(((moreno - morenos_min) / (morenos_max - morenos_min)) * 100) / 8.3)
                                    var azimuth_frac = Math.ceil(Math.ceil(((azimuth - azimuths_min) / (azimuths_max - azimuths_min)) * 100) / 8.3)
                                    if (!(mm0n > 0 & mm1n == 0 & mm2n == 0 & mm3n == 0)) {
                                        $("#main-tablebody-1").append("<tr class='result-row' id='row-" + d[0] + "'>" +
                                            "<td>" + d[1].gseq + "</td>" +
                                            "<td>" + pos + "</td>" +
                                            "<td>" + strand + "</td>" +
                                            "<td>" + calculateGCContent(d[1].gseq) + "%</td>" +
                                            "<td>" + mm0n + "</td>" +
                                            "<td>" + mm1n + "</td>" +
                                            "<td>" + mm2n + "</td>" +
                                            "<td>" + mm3n + "</td>" +
                                            "<td style='white-space:nowrap'>" + moreno + "<img src='https://www.crisprte.cn/static/img/svg/scales/" + moreno_frac + ".svg' style='width: 40pt;'>" + "</td>" +
                                            "<td style='white-space:nowrap'>" + azimuth + "<img src='https://www.crisprte.cn/static/img/svg/scales/" + azimuth_frac + ".svg' style='width: 40pt;'>" + "</td>" +
                                            // "<td>" + '' + "</td>" +
                                            "<td>" + parseFloat(d[1].score).toFixed(2) + "</td>" +
                                            " </tr>")
                                    }
                                });
                                $('#dataTable-1').DataTable({
                                    dom: 'Bfrtip',
                                    "lengthChange": false,
                                    "searching": false,
                                    buttons: [
                                        'copyHtml5',
                                        'excelHtml5',
                                        'csvHtml5',
                                        'pdfHtml5'
                                    ],
                                    "fnDrawCallback": () => {
                                        $("#main-datatable-1").find(".result-row").unbind("click");
                                        $("#main-datatable-1").find(".result-row").on("click", function(d) {
                                            var d = all_mismatch_data[this.id.split("-")[1]]
                                            $(".detail-mm").empty();
                                            $("#grna-detail").empty();
                                            $("#grna-detail").append("<h1 style='font-family: Courier;color:black;font-size:35pt'>" + "<span style='color:#dcdcdc' id='upstream'>" + d.upstream + "</span>" + d.gseq + "<span style='color:red' id='pam'>" + d.pam + "</span>" + "<span style='color:#dcdcdc' id='downstream'>" + d.downstream + "</span>" + " </h1>")
                                            clearGenomeViz("#result-viewer");
                                            $("#detail").removeClass("hidden");
                                            grna_chrom = d.pos.split("_")[0]
                                            grna_start = d.pos.split("_")[1]
                                            grna_end = d.pos.split("_")[2]
                                            grna_strand = d.pos.split("_")[3]
                                            var xhr1 = new XMLHttpRequest();
                                            xhr1.open("POST", "https://www.crisprte.cn/api/v3", true);
                                            xhr1.setRequestHeader('Content-Type', 'application/json');
                                            xhr1.send(JSON.stringify({
                                                ga: $("#ga").val(),
                                                key: "getGtfByRegion",
                                                type: "all",
                                                chrom: grna_chrom,
                                                start: parseInt(grna_start) - 3000,
                                                end: parseInt(grna_end) + 3000,
                                                "source": "viz"
                                            }));
                                            xhr1.onload = function() {
                                                genome_data = JSON.parse(decodeURIComponent(unzip(this.responseText)))
                                                genome_data.push({ start: parseInt(grna_start), end: parseInt(grna_end), feature: "grna", strand: grna_strand })
                                                createGenomeViz("#result-viewer", grna_chrom, parseInt(grna_start) - 3000, parseInt(grna_end) + 3000, genome_data);
                                            }
                        
                                            var domain = Array.prototype.concat(Object.keys(d.mm0.raw), Object.keys(d.mm1.raw), Object.keys(d.mm1.raw), Object.keys(d.mm1.raw))
                        
                                            pie_color = d3.scaleOrdinal(godsnot_102)
                                                .domain(domain)
                        
                                            createPie("#mm0", pie_color, d.mm0.raw);
                                            createPie("#mm1", pie_color, d.mm1.raw);
                                            createPie("#mm2", pie_color, d.mm2.raw);
                                            createPie("#mm3", pie_color, d.mm3.raw);
                        
                                            var sum = Object.values(d.mm0.class).reduce((a, b) => a + b, 0);
                                            Object.entries(d.mm0.class).map(d => $("#mm0").append("<tr>" + "<td style='font-family:arial;font-weight:600'><b>" + d[0] + " </b></td><td>" + d[1] + " (" + (100 * d[1] / sum).toFixed(2) + "%)</td></tr>"))
                                            var sum = Object.values(d.mm1.class).reduce((a, b) => a + b, 0);
                                            Object.entries(d.mm1.class).map(d => $("#mm1").append("<tr>" + "<td style='font-family:arial;font-weight:600'><b>" + d[0] + " </b></td><td>" + d[1] + " (" + (100 * d[1] / sum).toFixed(2) + "%)</td></tr>"))
                                            var sum = Object.values(d.mm2.class).reduce((a, b) => a + b, 0);
                                            Object.entries(d.mm2.class).map(d => $("#mm2").append("<tr>" + "<td style='font-family:arial;font-weight:600'><b>" + d[0] + " </b></td><td>" + d[1] + " (" + (100 * d[1] / sum).toFixed(2) + "%)</td></tr>"))
                                            var sum = Object.values(d.mm3.class).reduce((a, b) => a + b, 0);
                                            Object.entries(d.mm3.class).map(d => $("#mm3").append("<tr>" + "<td style='font-family:arial;font-weight:600'><b>" + d[0] + " </b></td><td>" + d[1] + " (" + (100 * d[1] / sum).toFixed(2) + "%)</td></tr>"))
                                            var xhr2 = new XMLHttpRequest();
                                            xhr2.open("POST", "https://www.crisprte.cn/api/v3", true);
                                            xhr2.setRequestHeader('Content-Type', 'application/json');
                                            xhr2.send(JSON.stringify({
                                                key: "getMismatchBedGseq",
                                                ga: $("#ga").val(),
                                                gseq: d.gseq
                                            }));
                                            xhr2.onload = function() {
                                                data = JSON.parse(decodeURIComponent(unzip(this.responseText)))
                                                Object.entries(data).map(function(d) {
                                                    var mm = d[0];
                                                    var info_csv = CSVToArray(d[1], '\t');
                                                    data[mm] = info_csv;
                                                    
                                                    $("#main-datatable-1-5").removeClass("hidden")
                                                })
                                                if (table1_5_initialized) {
                                                    $('#dataTable-1-5').DataTable().clear().destroy()
                                                    table1_5_initialized = false;
                                                }
                                                $("#dataTable-1-5-select-dropdown").unbind("change")
                                                data["mm0"].map(function(y) {
                                                    if (y[0]) {
                                                    $("#main-tablebody-1-5").append("<tr class='result-row' id='row-" + '?' + "'>" +
                                                            "<td>" + y[0] + "</td>" +
                                                            "<td>" + y[1] + "</td>" +
                                                            "<td>" + y[2] + "</td>" +
                                                            "<td>" + y[3] + "</td>" +
                                                            "<td>" + y[6] + "</td>" +
                                                            "<td>" + y[7].replaceAll("dup","copy")  + "</td>"  + " </tr>")
                                                    }
                                                })
                                                $(Array.from($($("#dataTable-1-5-select-dropdown").parent()).find(".item"))[0]).click()
                                                $('#dataTable-1-5').DataTable({
                                                    dom: 'Bfrtip',
                                                    "lengthChange": false,
                                                    "searching": false,
                                                    buttons: [
                                                        'copyHtml5',
                                                        'excelHtml5',
                                                        'csvHtml5',
                                                        'pdfHtml5'
                                                    ],
                                                    'iDisplayLength': 30,
                                                    // "aLengthMenu":[10, 50, 100]
                                                });
                                                table1_5_initialized = true;
                        
                                                $("#dataTable-1-5-select-dropdown").on("change", function(d) {
                                                    var mm = $("#dataTable-1-5-select-dropdown").val()
                                                    if (table1_5_initialized) {
                                                        $('#dataTable-1-5').DataTable().clear().destroy()
                                                        table1_5_initialized = false;
                                                    }
                                                    data["mm" + mm].map(function(y) {
                                                        if (y[0]) {
                                                        $("#main-tablebody-1-5").append("<tr class='result-row' id='row-" + '?' + "'>" +
                                                                "<td>" + y[0] + "</td>" +
                                                                "<td>" + y[1] + "</td>" +
                                                                "<td>" + y[2] + "</td>" +
                                                                "<td>" + y[3] + "</td>" +
                                                                "<td>" + y[6] + "</td>" +
                                                                "<td>" + y[7].replaceAll("dup","copy")  + "</td>"  + " </tr>")
                                                        }
                                                    })
                                                    $('#dataTable-1-5').DataTable({
                                                        dom: 'Bfrtip',
                                                        "lengthChange": false,
                                                        "searching": false,
                                                        buttons: [
                                                            'copyHtml5',
                                                            'excelHtml5',
                                                            'csvHtml5',
                                                            'pdfHtml5'
                                                        ],
                                                        'iDisplayLength': 30,
                                                        // "aLengthMenu":[10, 50, 100]
                                                    });
                                                    table1_5_initialized = true;
                                                })
                                            }
                                    })
                                    },
                                    'iDisplayLength': 15,
                                    // "aLengthMenu":[10, 50, 100]
                                });
                                table1_initialized = true;
                        }
                        

                        }
                    }
            }
        } else {
            if ($("#seq-for").val() == "1") {
                var gseqs = Array.from($("mark")).map(function(d) {
                    t = $(d).text()
                    return t.slice(0, 20);
                })
            } else {
                var gseqs = Array.from($("mark")).map(function(d) {
                    t = $(d).text()
                    if (t.endsWith("GG")) { return t.slice(0, 20) } else { return reverseComplement(t).slice(0, 20) }
                })
            }
            var xhr = new XMLHttpRequest();
            xhr.open("POST", "https://www.crisprte.cn/api/v3", true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify({
                key: "getMismatchBedGseq",
                ga:  $("#ga").val(),
                gseqs: gseqs
            }));
            xhr.onload = function() {
                if (table2_initialized) {
                    $('#dataTable-2').DataTable().clear().destroy()
                    table2_initialized = false;
                    $("#mm0-2").empty()
                    $("#mm1-2").empty()
                    $("#mm2-2").empty()
                    $("#mm3-2").empty()
                }
                $("#dataTable-2-select-dropdown").html("<option></option>");
                
                data = JSON.parse(decodeURIComponent(unzip(this.responseText)))
                
                Object.entries(data).map(function(d) {
                    var gseq = d[0];
                    $("#dataTable-2-select-dropdown").append("<option value='" + gseq + "'>" + gseq + "</option>");
                })
         
                scrollPage($("#gseq-detail"))

                $("#gseq-detail").removeClass("hidden")
                if (table1_initialized) {
                    $("#main-datatable-1").addClass("hidden")
                    $("#detail").addClass("hidden");
                }
                $("#dataTable-2-select-dropdown").on("change", function(d) {
                    gseq = $("#dataTable-2-select-dropdown").val();
                    if (table2_initialized) {
                        $("#mm0-2").empty()
                        $("#mm1-2").empty()
                        $("#mm2-2").empty()
                        $("#mm3-2").empty()
                    }
                    var domain = Array.prototype.concat(Object.keys(data[gseq]["mm0"]["raw"]), Object.keys(data[gseq]["mm1"]["raw"]), Object.keys(data[gseq]["mm2"]["raw"]), Object.keys(data[gseq]["mm3"]["raw"]))         


                    pie_color = d3.scaleOrdinal([`#383867`, `#584c77`, `#33431e`, `#a36629`, `#92462f`, `#b63e36`, `#b74a70`, `#946943`])
                    .domain(domain)
 
                    createPie("#mm0-2", pie_color, data[gseq]["mm0"]["raw"]);
                    createPie("#mm1-2", pie_color, data[gseq]["mm1"]["raw"]);
                    createPie("#mm2-2", pie_color, data[gseq]["mm2"]["raw"]);
                    createPie("#mm3-2", pie_color, data[gseq]["mm3"]["raw"]);

                })

                $("#dataTable-2-select-dropdown, #dataTable-2-select-mm").on("change", function(d) {
                    gseq = $("#dataTable-2-select-dropdown").val();
                        if (table2_initialized) {
                            $('#dataTable-2').DataTable().clear().destroy()
                            table2_initialized = false;
                        }
                        // default is mm0 prefect mismatch
                        var mm = $("#dataTable-2-select-mm").val();
                        var parsed = CSVToArray(data[gseq]["mm" + mm]["target"], '\t');
                        parsed = parsed.slice(0,parsed.length-1);
                        parsed.map(function(y) {
                            if (y[0]) {

                            $("#main-tablebody-2").append("<tr class='result-row' id='row-" + gseq + "'>" +
                            "<td>" + y[0] + "</td>" +
                            "<td>" + y[1] + "</td>" +
                            "<td>" + y[2] + "</td>" +
                            "<td>" + y[3] + "</td>" +
                            "<td>" + y[6] + "</td>" +
                            "<td>" + y[7].replaceAll("dup","copy")  + "</td>"  + " </tr>")
                            }
                        })
                        $('#dataTable-2').DataTable({
                            dom: 'Bfrtip',
                            "lengthChange": false,
                            "searching": false,
                            buttons: [
                                'copyHtml5',
                                'excelHtml5',
                                'csvHtml5',
                                'pdfHtml5'
                            ],
                            'iDisplayLength': 15,
                            // "aLengthMenu":[10, 50, 100]
                        });
                        table2_initialized = true;
                    })

            }
            waitUntil(() => Array.from($($("#dataTable-2-select-dropdown").parent()).find(".item")).length > 0, () => {
                $(Array.from($($("#dataTable-2-select-dropdown").parent()).find(".item"))[0]).click();
            })
        }
    });
});