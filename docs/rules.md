In the context of No Limit Hold'em (NLH), the game state is defined by a sequence of betting rounds and communal card revelations, aimed at optimizing the expected value (EV) of a hand or inducing a fold. For an LLM, the logic can be broken down into structural components and state transitions.

1. Game State Initialization

The game is played with a standard 52-card deck. Each hand begins with a mandatory contribution to the pot to ensure action:

Small Blind (SB): Posted by the player to the immediate left of the dealer button.

Big Blind (BB): Posted by the player to the left of the SB (usually 2× SB).

2. The Turn Structure (The Street Sequence)

A full hand consists of four distinct betting rounds. If at any point all but one player fold, the remaining player wins the pot and the hand terminates.

Street Action
Pre-flop Each player is dealt 2 private cards (Hole Cards). Action starts with the player "Under the Gun" (UTG), left of the BB.
The Flop 3 community cards are dealt face-up. Action starts with the first active player left of the button.
The Turn 1 community card is dealt face-up (the 4th card). Betting ensues.
The River 1 community card is dealt face-up (the 5th and final card). Final betting round. 3. Player Action Logic

On any given turn, a player must select one of the following operations based on the current bet level (L):

Fold: Terminate participation in the hand; EV=0 for the remainder of the street.

Check: Pass the action to the next player (only possible if the current bet L for the round is 0).

Call: Match the current highest bet.

Bet/Raise: Increase the current bet level. In "No Limit," the maximum raise is the player's entire stack (All-in). The minimum raise must typically be equal to or greater than the previous bet or raise in the same round.

4. Determination of Winners (The Showdown)

If two or more players remain after the River betting round, a Showdown occurs.

Objective: Form the best 5-card hand using any combination of the 2 hole cards and 5 community cards.

Hand Hierarchy: Evaluation follows standard poker rankings (High Card < Pair < Two Pair < Three of a Kind < Straight < Flush < Full House < Four of a Kind < Straight Flush < Royal Flush).

Kickers: If players share the same primary hand rank (e.g., both have a Pair of Aces), the highest remaining cards in the 5-card set (kickers) determine the winner.

5. Mechanical Constraints

Table Stakes: A player cannot be forced to fold because they lack the funds to match a bet; they can go "All-in," creating a side pot for subsequent betting among other players.

The "No Limit" Variable: Unlike Limit Hold'em, the bet sizing is a continuous variable ranging from the minimum legal raise to the total chip count, creating a game tree with significantly higher complexity and branching factors.
