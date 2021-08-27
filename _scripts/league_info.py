#!/usr/bin/python
import sys, getopt, json
from sleeper_wrapper import *
from tabulate import tabulate

## Prereqs:
# Save the output of Sleeper's Fetch All Players (https://docs.sleeper.app/#players) to 'players.txt'
# Can be done by running `league_info.py -s output_players_file`

# 2019: 410927631714754560
# 2020: 519359914084585472
# 2021: 683509409514627072

def draft_id():
    drafts = league.get_all_drafts()
    for draft in drafts:
        if draft.get('status') == "complete":
            return draft['draft_id']
    print("No drafts found")
    sys.exit(2)

def bid_to_keeper_value():
    return {
            1: {'low': 66, 'high': 100},
            2: {'low': 46, 'high': 65},
            3: {'low': 36, 'high': 45},
            4: {'low': 26, 'high': 35},
            5: {'low': 21, 'high': 25},
            6: {'low': 16, 'high': 20},
            7: {'low': 11, 'high': 15},
            8: {'low': 6, 'high': 10},
            9: {'low': 1, 'high': 5},
        }

def keepers_from_draft():
    keeper_ids = []
    for picks in draft_picks:
        if picks.get('is_keeper'):
            keeper_ids.append(picks['player_id'])
    return keeper_ids

def player_was_dropped(player_id):
    for week in weekly_transactions:
        for transaction in week:
            if transaction.get('type') not in ['trade', 'commissioner']:
                drops = transaction.get('drops')
                if drops is not None:
                    for id in drops:
                        if player_id == id:
                            return True
    return False

def player_was_drafted(player_id):
    for pick in draft_picks:
        if pick.get('player_id') == player_id:
            return pick.get('round')
    return False

def keeper_value_from_draft(round):
    value = round - 1
    if value <= 0:
        value = 1
    return value

def map_id_to_player(id_number):
    for key in players:
        if id_number == key:
            return players[key]

def keeper_value_from_bid(bid):
    scale = bid_to_keeper_value()
    for round, range in scale.items():
        if range['low'] <= bid <= range['high']:
            return round
    return 10

def rostered_players(roster):
    players = []
    for player_id in roster['players']:
        player_info = map_id_to_player(player_id)
        keeper_value = 10
        reason = ""
        print_debug("Player Info: ", player_info)
        print_debug("Player was dropped?: ", player_was_dropped(player_id))
        if player_id in previous_keepers and not player_was_dropped(player_id):
            keeper_value = 1
            reason = "Previous Draft Keeper"
        elif player_was_dropped(player_id) or not player_was_drafted(player_id):
            transaction = latest_add_by_player_id(player_id)
            week = str(transaction['leg'])
            bid = bid_amount(transaction)
            keeper_value = keeper_value_from_bid(bid)
            reason = "Picked up week " + week + " for $" + str(bid)
        else:
            round_drafted = player_was_drafted(player_id)
            keeper_value = keeper_value_from_draft(round_drafted)
            reason = "Drafted in round " + str(round_drafted)
        players.extend([[player_info['position'], player_info['first_name'] + " " + player_info['last_name'], str(keeper_value), reason]])
    return players

def league_winners():
    bracket = league.get_playoff_winners_bracket()
    print_debug("Winners Bracket:", bracket)
    user_rosters = league.map_rosterid_to_ownerid(rosters)
    print_debug("User Rosters:", user_rosters)
    return {"first": user_rosters[bracket[-2]['w']], "second": user_rosters[bracket[-2]['l']], "third": user_rosters[bracket[-1]['w']]}

def league_owners():
    league_owners = []
    for record in standings:
        for owner in users:
            team_name = owner['metadata'].get('team_name')
            if team_name is None:
                team_name = owner['display_name']
            print_debug("Owner: " + team_name, owner)
            if team_name in record:
                for roster in rosters:
                    if owner['user_id'] == roster['owner_id']:
                        points_against = roster['settings']['fpts_against']
                team_record = record[1] + "-" + record[2]
                league_owners.append({'display_name': owner['display_name'], 'user_id': owner['user_id'], 'team_name': team_name, 'record': team_record, 'points_scored': record[3], 'points_against': points_against})
    return league_owners

def league_standings():
    table = []
    headers = ["User", "Team Name", "Record", "Points Scored", "Points Against"]
    for owner in league_owners:
        place_str = ""
        for place, user_id in league_winners().items():
            if owner['user_id'] == user_id:
                place_str = " (" + place + ")"
        table.append([owner['display_name'] + place_str, owner['team_name'], owner['record'], owner['points_scored'], owner['points_against']])
    print(tabulate(table, headers, tablefmt="github"))

def draft_order():
    table = []
    headers = ["Pick Position", "Owner"]
    i = 1
    for owner in reversed(league_owners):
        table.append([str(i), owner['display_name']])
        i += 1
    print("<h2>Draft Order:<h2>")
    print(tabulate(table, headers, tablefmt="html"))


def team_rosters():
    print("\nTeam Rosters\n")
    headers = ["Position", "Player", "Keeper Value", "Reason"]
    for owner in league_owners:
        for roster in rosters:
            if owner['user_id'] == roster['owner_id']:
                header = owner['team_name'] + " run by " + owner['display_name']
                print(header)
                printable_roster = rostered_players(roster)
                print(tabulate(printable_roster, headers, tablefmt="presto"))
                print("\n")
                if save_keepers is True:
                    table_to_write = tabulate(printable_roster, headers, tablefmt="html")
                    with open('../pages/keeper_values.html', 'a') as file:
                        file.write("<h2>" + header + "</h2>")
                        file.write(table_to_write)

def all_transactions():
    all_transactions = []
    for week in range(16, 0, -1):
        all_transactions.append(league.get_transactions(week))
    return all_transactions

def bid_amount(transaction):
    settings = transaction.get('settings')
    if settings is not None:
        waiver_bid = settings.get('waiver_bid')
        if waiver_bid is not None:
            return waiver_bid
    return 0

def latest_add_by_player_id(player_id):
    for week in weekly_transactions:
        for transaction in week:
            if transaction.get('type') != 'trade' and transaction.get('status') == 'complete':
                adds = transaction.get('adds')
                if adds is not None:
                    for id in adds:
                        if player_id == id:
                            return transaction
    return {}

def get_all_players(outfile):
    data = Players().get_all_players()
    with open(outfile, 'w') as output:
        json.dump(data, output)

def help():
    print("Usage: %s -i input_players_file -l league_id" % sys.argv[0])
    print("\tPrints the league standings and keeper values\n")
    print("Usage: %s -s output_players_file")
    print("\tSaves all players to file. Use sparingly\n")
    sys.exit(2)

def parse(argv):
    ifile=''
    league_id=''
    verbose=False
    save_keepers=False
    drafting_order=False

    try:
        myopts, args = getopt.getopt(sys.argv[1:],"i:l:s:hdvk")
    except getopt.GetoptError as e:
        print (str(e))
        help()

    for o, a in myopts:
        if o == '-i':
            ifile=a
        elif o == '-l':
            league_id=a
        elif o == '-s':
            get_all_players(a)
            print("Saved all players to " + a)
            sys.exit(2)
        elif o == '-v':
            verbose=True
        elif o == '-d':
            drafting_order=True
        elif o == '-k':
            save_keepers=True
        else:
            help()
    if not ifile or not league_id:
        print("Both -i and -l are required")
        help()
    return league_id, ifile, verbose, save_keepers, drafting_order

def team_logo(user_id):
    avatar_id = User(597616010341711872).get_user()['avatar']
    return "https://sleepercdn.com/avatars/" + str(avatar_id)

def print_debug(title, value):
    if verbose is True:
        print(title)
        print(value)
        print("------------------------------\n")

# Full size URL
#
# https://sleepercdn.com/avatars/<avatar_id>
#
# Thumbnail URL
#
# https://sleepercdn.com/avatars/thumbs/<avatar_id>

league_id, inputfile, verbose, save_keepers, drafting_order = parse(sys.argv[1:])
league = League(league_id)
rosters = league.get_rosters()
users = league.get_users()
standings = league.get_standings(rosters, users)
league_owners = league_owners()

if drafting_order is True:
    draft_order()
    sys.exit(0)

draft_picks = Drafts(draft_id()).get_all_picks()
previous_keepers = keepers_from_draft()
weekly_transactions = all_transactions()

# print(users)
# user = User(597616010341711872)
# print(user.get_user())
# print(team_logo(597616010341711872))

with open(inputfile) as json_file:
    players = json.load(json_file)

league_standings()
team_rosters()
