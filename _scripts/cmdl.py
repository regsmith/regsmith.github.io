from optparse import OptionParser

def main():
    usage = "usage: %prog [options] arg"
    parser = OptionParser(usage=usage)
    parser.add_option("-i", "--input_file", dest="input_file", help="read player data from INPUT_FILE")
    parser.add_option("-l", "--league_id", dest="league_id", type="int", help="league id from sleeper")
    parser.add_option("-v", "--verbose", action="store_true", dest="verbose")
    parser.add_option("-q", "--quiet", action="store_false", dest="verbose")

    (options, args) = parser.parse_args()
    if options.input_file is None:
        print("ERR: input file is required")
        parser.print_help()
        exit(2)
    if options.league_id is None:
        print("ERR: league ID is required")
        parser.print_help()
        exit(2)

if __name__ == "__main__":
    main()


# def parse(argv):
#     ifile=''
#     league_id=''
#
#     try:
#         myopts, args = getopt.getopt(sys.argv[1:],"i:l:s:h")
#     except getopt.GetoptError as e:
#         print (str(e))
#         help()
#
#     for o, a in myopts:
#         if not a and o != '-h':
#             print("Can not have empty value for " + o)
#             help()
#         else:
#             if o == '-i':
#                 ifile=a
#             elif o == '-l':
#                 league_id=a
#             elif o == '-s':
#                 get_all_players(a)
#                 print("Saved all players to " + a)
#                 sys.exit(2)
#             else:
#                 help()
#     if not ifile or not league_id:
#         print("Both -i and -l are required")
#         help()
#     return league_id, ifile
#
#
# def help():
#     print("Usage: %s -i input_players_file -l league_id" % sys.argv[0])
#     print("\tPrints the league standings and keeper values\n")
#     print("Usage: %s -s output_players_file")
#     print("\tSaves all players to file. Use sparingly\n")
#     sys.exit(2)
