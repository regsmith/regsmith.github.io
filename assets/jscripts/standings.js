var source = "https://raw.githubusercontent.com/regsmith/regsmith.github.io/main/_data/legacy_data.json"

fetch(source)
    .then(response => response.json())
    .then(data => showRoster(data.seasons[`${season}`]));

showRoster = teams => {
    function addHeaders(table) {
        var row = table.createTHead().insertRow();
        let keys = ["Team", "Owner", "Record", "Points Scored", "Points Against"];
        for(const key of keys) {
            // console.log(key);
            th = document.createElement('th');
            th.innerHTML = key;
            row.appendChild(th);
        }
    }

    function isNumeric(str) {
        if (typeof str != "string") return false
        return !isNaN(str) && !isNaN(parseFloat(str))
    }

    function decimal(cell_text) {
        if (!isNumeric(cell_text)) return cell_text;
        return Number.parseFloat(cell_text).toFixed(2);
    }

    var standings_table = document.createElement("table");
    standings_table.setAttribute("class", "sortable");
    standings_table.setAttribute("id", "standings_table");
    for (var i = 1; i <= 10; i++) {
        if (i === 1) {
            addHeaders(standings_table);
            var table_body = standings_table.createTBody();
        }
        for (var team in teams) {
            if(teams[team]["Rank"] === i.toString()) {
                var row = table_body.insertRow();
                row.setAttribute("class", "clickable-row");
                let teampage = `/seasons/${season}/${team.replace(/\W/g, '').toLowerCase()}`;
                row.setAttribute("data-href", teampage);
                row.insertCell().appendChild(document.createTextNode(team));
                team = teams[team];
                console.log(team);
                let keys = ["Owner", "Record", "Points Scored", "Points Against"];
                for(const key of keys) {
                    var cell = row.insertCell();
                    let cell_text = team[key]
                    if (key === "Record") {
                        cell_text = `${team["Wins"]}-${team["Losses"]}`;
                        cell.setAttribute("sorttable_customkey", i.toString());
                    }
                    cell.appendChild(document.createTextNode(decimal(cell_text)));
                }
                break;
            }
        }
    }

    document.getElementById('standings').appendChild(standings_table);
    sorttable.makeSortable(standings_table);

    jQuery(document).ready(function($) {
        $(".clickable-row").click(function() {
            window.location = $(this).data("href");
        });
    });
}
