#!/bin/bash
# Copy values for voice agent setup
cd "$(dirname "$0")/.."

show_menu() {
    clear
    echo ""
    echo "  COPY FOR VOICE AGENT (Tri)"
    echo "  Press a number, then Enter. It copies that thing."
    echo "  Then go to your agent dashboard and paste."
    echo ""
    echo "    1  Tri's instructions        (agent: Instructions)"
    echo "    2  Greeting variable text    (agent: Variables, opening_line)"
    echo "    3  Tool description         (Tools, laptop_action: Description)"
    echo "    4  Tool URL                 (Tools, laptop_action: URL)"
    echo "    5  Tri's password           (Tools, laptop_action: Bearer token secret)"
    echo ""
    echo "    6  Lock Tri to only my phone (do this after first phone call works)"
    echo ""
    echo "    0  Close"
    echo ""
    read -p "  Your choice: " pick
}

copy_to_clipboard() {
    local text="$1"
    if command -v wl-copy &> /dev/null; then
        echo -n "$text" | wl-copy
    elif command -v xclip &> /dev/null; then
        echo -n "$text" | xclip -selection clipboard
    elif command -v xsel &> /dev/null; then
        echo -n "$text" | xsel --clipboard --input
    else
        echo "No clipboard tool found (install xclip or wl-clipboard)"
        return 1
    fi
    return 0
}

if [ -n "$1" ]; then
    case "$1" in
        1) copy_to_clipboard "$(cat prompts/tri-instructions.txt)"; echo "Tri's instructions copied." ;;
        2) copy_to_clipboard "Hey Boss, it's Tri. What can I do for you?"; echo "Greeting text copied." ;;
        3) copy_to_clipboard "$(cat prompts/tri-tool-description.txt)"; echo "Tool description copied." ;;
        4) if [ ! -f "tri/tunnel-url.txt" ]; then echo "No tool URL yet. Run start-tri.sh first."; exit 1; fi; copy_to_clipboard "$(cat tri/tunnel-url.txt | tr -d '\n')"; echo "Tool URL copied." ;;
        5) if [ ! -f "tri/.env" ]; then echo "Tri not set up yet. Run start-tri.sh first."; exit 1; fi; TOKEN=$(grep -E '^TRI_TOKEN=|^JARVIS_TOKEN=' tri/.env | cut -d= -f2 | tr -d '\n'); copy_to_clipboard "$TOKEN"; echo "Tri's password copied." ;;
        6) if [ ! -f "tri/.env" ]; then echo "Tri not set up yet. Run start-tri.sh first."; exit 1; fi; sed -i 's/^ALLOW_NO_CALLER=.*/ALLOW_NO_CALLER=false/' tri/.env; sed -i 's/^TRI_ALLOW_NO_CALLER=.*/TRI_ALLOW_NO_CALLER=false/' tri/.env; echo "Done. Tri now only obeys your phone." ;;
        *) echo "Invalid choice" ;;
    esac
    exit 0
fi

while true; do
    show_menu
    case "$pick" in
        0) exit 0 ;;
        1) copy_to_clipboard "$(cat prompts/tri-instructions.txt)" && echo -e "\nTri's instructions copied.\n" && read -p "Press Enter to continue..." ;;
        2) copy_to_clipboard "Hey Boss, it's Tri. What can I do for you?" && echo -e "\nGreeting text copied.\n" && read -p "Press Enter to continue..." ;;
        3) copy_to_clipboard "$(cat prompts/tri-tool-description.txt)" && echo -e "\nTool description copied.\n" && read -p "Press Enter to continue..." ;;
        4) if [ ! -f "tri/tunnel-url.txt" ]; then echo -e "\nNo tool URL yet. Run start-tri.sh first.\n"; else copy_to_clipboard "$(cat tri/tunnel-url.txt | tr -d '\n')" && echo -e "\nTool URL copied.\n"; fi && read -p "Press Enter to continue..." ;;
        5) if [ ! -f "tri/.env" ]; then echo -e "\nTri not set up yet. Run start-tri.sh first.\n"; else TOKEN=$(grep -E '^TRI_TOKEN=|^JARVIS_TOKEN=' tri/.env | cut -d= -f2 | tr -d '\n'); copy_to_clipboard "$TOKEN" && echo -e "\nTri's password copied.\n"; fi && read -p "Press Enter to continue..." ;;
        6) if [ ! -f "tri/.env" ]; then echo -e "\nTri not set up yet. Run start-tri.sh first.\n"; else sed -i 's/^ALLOW_NO_CALLER=.*/ALLOW_NO_CALLER=false/' tri/.env; sed -i 's/^TRI_ALLOW_NO_CALLER=.*/TRI_ALLOW_NO_CALLER=false/' tri/.env; echo -e "\nDone. Tri now only obeys your phone.\n"; fi && read -p "Press Enter to continue..." ;;
        *) echo -e "\nInvalid choice\n" && read -p "Press Enter to continue..." ;;
    esac
done
