var source = `https://raw.githubusercontent.com/regsmith/regsmith.github.io/main/_data/previous_rosters.json`

fetch(source)
    .then(response => response.json())
    .then(players => showRoster(players.seasons[`${season}`][`${team}`]));

showRoster = roster => {
    function addHeaders(table, keys) {
        var row = roster_table.createTHead().insertRow();
        for( var i = 0; i < keys.length; i++ ) {
            th = document.createElement('th');
            th.innerHTML = keys[i];
            row.appendChild(th);
        }
    }

    function decimal(x) {
        var to_number = Number.parseFloat(x);
        if(isNaN(to_number)) {
            return x;
        } else {
            return to_number.toFixed(2);
        }
    }

    var roster_table = document.createElement("table")
    roster_table.setAttribute("class", "sortable")
    roster_table.setAttribute("id", "roster_table")
    for(var i = 0; i < roster.length; i++) {
        var player = roster[i];
        if(i === 0 ) {
            addHeaders(roster_table, Object.keys(player));
            var table_body = roster_table.createTBody();
        }
        var row = table_body.insertRow();
        Object.keys(player).forEach(function(k) {
            console.log(k);
            var cell = row.insertCell();
            cell.appendChild(document.createTextNode(decimal(player[k])));
        })
    }

    document.getElementById('roster').appendChild(roster_table);
}
