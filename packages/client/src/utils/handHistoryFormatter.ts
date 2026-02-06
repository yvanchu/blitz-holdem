import type { CompletedHand } from '../store/handHistoryStore';
import type { Card } from '@blitz-holdem/common';

// Suit symbols
const SUIT_SYMBOLS: Record<string, string> = {
  h: '♥',
  d: '♦',
  c: '♣',
  s: '♠',
};

// Suit colors for styling
export const SUIT_COLORS: Record<string, string> = {
  h: 'text-red-500',
  d: 'text-blue-500',
  c: 'text-green-600',
  s: 'text-zinc-800',
};

// Format a single card for display
export function formatCard(card: Card): string {
  return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
}

// Format cards array
export function formatCards(cards: Card[]): string {
  return cards.map(formatCard).join(' ');
}

// Format hole cards with brackets
export function formatHoleCards(cards: [Card, Card] | null): string {
  if (!cards) return '[?? ??]';
  return `[${formatCard(cards[0])} ${formatCard(cards[1])}]`;
}

// Get position label
function getPositionLabel(seatIndex: 0 | 1, dealerSeat: number): string {
  // In heads-up, dealer is SB (button)
  if (seatIndex === dealerSeat) return 'BTN/SB';
  return 'BB';
}

// Format a hand for human-readable display
export function formatHandHistory(hand: CompletedHand): string {
  const { ohhData, heroSeatIndex, heroHoleCards, opponentHoleCards, communityCards, winnerHandRank, potAwarded, isSplit, splitWinners } = hand;
  const ohh = ohhData.ohh;

  const lines: string[] = [];

  // Header
  lines.push('═══════════════════════════════════════════════════');
  lines.push(`BLITZ HOLD'EM HAND #${hand.handNumber}`);
  
  const date = new Date(hand.timestamp);
  const dateStr = date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  lines.push(`Room: ${ohh.table_name} | Blinds: ${ohh.small_blind_amount}/${ohh.big_blind_amount} sec | ${dateStr}`);
  lines.push('═══════════════════════════════════════════════════');
  lines.push('');

  // Players
  lines.push('PLAYERS:');
  for (const player of ohh.players) {
    const isHero = player.seat - 1 === heroSeatIndex;
    const position = getPositionLabel(player.seat - 1 as 0 | 1, ohh.dealer_seat - 1);
    const name = isHero ? `${player.name} (Hero)` : player.name;
    lines.push(`  Seat ${player.seat}: ${name} (${position}) - ${player.starting_stack} sec`);
  }
  lines.push('');

  // Hole cards (hero's perspective)
  if (heroHoleCards) {
    lines.push(`HOLE CARDS [Hero]: ${formatHoleCards(heroHoleCards)}`);
    lines.push('');
  }

  // Process rounds
  let cumulativeBoard: Card[] = [];
  
  for (const round of ohh.rounds) {
    // Street header
    if (round.street === 'Preflop') {
      lines.push('── PREFLOP ──');
    } else {
      // Update cumulative board
      if (round.street === 'Flop' && communityCards.length >= 3) {
        cumulativeBoard = communityCards.slice(0, 3);
      } else if (round.street === 'Turn' && communityCards.length >= 4) {
        cumulativeBoard = communityCards.slice(0, 4);
      } else if (round.street === 'River' && communityCards.length >= 5) {
        cumulativeBoard = communityCards.slice(0, 5);
      }
      
      lines.push(`── ${round.street.toUpperCase()} ── [${formatCards(cumulativeBoard)}]`);
    }

    // Actions
    for (const action of round.actions) {
      const player = ohh.players.find(p => p.id === action.player_id);
      if (!player) continue;

      const isHero = player.seat - 1 === heroSeatIndex;
      const name = isHero ? 'Hero' : player.name;

      let actionStr = '';
      switch (action.action) {
        case 'Post SB':
          actionStr = `posts small blind ${action.amount} sec`;
          break;
        case 'Post BB':
          actionStr = `posts big blind ${action.amount} sec`;
          break;
        case 'Fold':
          actionStr = 'folds';
          break;
        case 'Check':
          actionStr = 'checks';
          break;
        case 'Call':
          actionStr = action.amount ? `calls ${action.amount} sec` : 'calls';
          break;
        case 'Bet':
          actionStr = `bets ${action.amount} sec`;
          break;
        case 'Raise':
          actionStr = action.is_allin 
            ? `raises to ${action.amount} sec (all-in)` 
            : `raises to ${action.amount} sec`;
          break;
        default:
          actionStr = action.action.toLowerCase();
      }

      lines.push(`  ${name} ${actionStr}`);
    }
    lines.push('');
  }

  // Result
  lines.push('── RESULT ──');
  
  const pot = ohh.pots[0];
  const totalPot = pot?.amount || potAwarded;

  // Show opponent's cards if they were revealed
  if (opponentHoleCards) {
    const opponentPlayer = ohh.players.find(p => p.seat - 1 !== heroSeatIndex);
    if (opponentPlayer) {
      lines.push(`  ${opponentPlayer.name} shows ${formatHoleCards(opponentHoleCards)}`);
    }
  }

  // Winner line - handle split pot
  if (isSplit && splitWinners && splitWinners.length > 1) {
    // Strip "(split)" from hand rank if present for cleaner display
    const cleanHandRank = winnerHandRank?.replace(' (split)', '') || '';
    lines.push(`  Split pot! Both players have ${cleanHandRank}`);
    
    // Use the OHH pot data for player names since it has the correct player IDs
    const potWinners = pot?.player_wins || [];
    for (const potWinner of potWinners) {
      const winnerPlayer = ohh.players.find(p => p.id === potWinner.player_id);
      const isHero = winnerPlayer ? winnerPlayer.seat - 1 === heroSeatIndex : false;
      const name = isHero ? 'Hero' : (winnerPlayer?.name || 'Unknown');
      lines.push(`    ${name} wins ${potWinner.win_amount} sec`);
    }
  } else {
    const winnerPlayerId = pot?.player_wins?.[0]?.player_id;
    const winnerPlayer = winnerPlayerId !== undefined
      ? ohh.players.find(p => p.id === winnerPlayerId)
      : undefined;
    
    const winnerIsHero = winnerPlayer ? winnerPlayer.seat - 1 === heroSeatIndex : false;
    const winnerName = winnerIsHero ? 'Hero' : (winnerPlayer?.name || 'Unknown');

    if (winnerHandRank) {
      lines.push(`  ${winnerName} wins ${potAwarded} sec with ${winnerHandRank}`);
    } else {
      lines.push(`  ${winnerName} wins ${potAwarded} sec`);
    }
  }
  
  lines.push(`  Pot: ${totalPot} sec`);
  lines.push('');
  lines.push('═══════════════════════════════════════════════════');

  return lines.join('\n');
}

// Structured format for React rendering (more control over styling)
export interface FormattedLine {
  type: 'divider' | 'header' | 'subheader' | 'section' | 'action' | 'result' | 'empty';
  text: string;
  cards?: Card[];
  highlight?: boolean;
}

export function formatHandHistoryStructured(hand: CompletedHand): FormattedLine[] {
  const { ohhData, heroSeatIndex, heroHoleCards, opponentHoleCards, communityCards, winnerHandRank, potAwarded, isSplit, splitWinners } = hand;
  const ohh = ohhData.ohh;

  const lines: FormattedLine[] = [];

  // Header
  lines.push({ type: 'divider', text: '═══════════════════════════════════════════════════' });
  lines.push({ type: 'header', text: `BLITZ HOLD'EM HAND #${hand.handNumber}` });
  
  const date = new Date(hand.timestamp);
  const dateStr = date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  lines.push({ type: 'subheader', text: `Room: ${ohh.table_name} | Blinds: ${ohh.small_blind_amount}/${ohh.big_blind_amount} sec | ${dateStr}` });
  lines.push({ type: 'divider', text: '═══════════════════════════════════════════════════' });
  lines.push({ type: 'empty', text: '' });

  // Players
  lines.push({ type: 'section', text: 'PLAYERS:' });
  for (const player of ohh.players) {
    const isHero = player.seat - 1 === heroSeatIndex;
    const position = getPositionLabel(player.seat - 1 as 0 | 1, ohh.dealer_seat - 1);
    const name = isHero ? `${player.name} (Hero)` : player.name;
    lines.push({ 
      type: 'action', 
      text: `Seat ${player.seat}: ${name} (${position}) - ${player.starting_stack} sec`,
      highlight: isHero 
    });
  }
  lines.push({ type: 'empty', text: '' });

  // Hole cards
  if (heroHoleCards) {
    lines.push({ type: 'section', text: 'HOLE CARDS [Hero]:', cards: heroHoleCards });
    lines.push({ type: 'empty', text: '' });
  }

  // Process rounds
  let cumulativeBoard: Card[] = [];
  
  for (const round of ohh.rounds) {
    if (round.street === 'Preflop') {
      lines.push({ type: 'section', text: '── PREFLOP ──' });
    } else {
      if (round.street === 'Flop' && communityCards.length >= 3) {
        cumulativeBoard = communityCards.slice(0, 3);
      } else if (round.street === 'Turn' && communityCards.length >= 4) {
        cumulativeBoard = communityCards.slice(0, 4);
      } else if (round.street === 'River' && communityCards.length >= 5) {
        cumulativeBoard = communityCards.slice(0, 5);
      }
      
      lines.push({ type: 'section', text: `── ${round.street.toUpperCase()} ──`, cards: cumulativeBoard });
    }

    for (const action of round.actions) {
      const player = ohh.players.find(p => p.id === action.player_id);
      if (!player) continue;

      const isHero = player.seat - 1 === heroSeatIndex;
      const name = isHero ? 'Hero' : player.name;

      let actionStr = '';
      switch (action.action) {
        case 'Post SB':
          actionStr = `posts small blind ${action.amount} sec`;
          break;
        case 'Post BB':
          actionStr = `posts big blind ${action.amount} sec`;
          break;
        case 'Fold':
          actionStr = 'folds';
          break;
        case 'Check':
          actionStr = 'checks';
          break;
        case 'Call':
          actionStr = action.amount ? `calls ${action.amount} sec` : 'calls';
          break;
        case 'Bet':
          actionStr = `bets ${action.amount} sec`;
          break;
        case 'Raise':
          actionStr = action.is_allin 
            ? `raises to ${action.amount} sec (all-in)` 
            : `raises to ${action.amount} sec`;
          break;
        default:
          actionStr = action.action.toLowerCase();
      }

      lines.push({ type: 'action', text: `${name} ${actionStr}`, highlight: isHero });
    }
    lines.push({ type: 'empty', text: '' });
  }

  // Result
  lines.push({ type: 'section', text: '── RESULT ──' });
  
  const pot2 = ohh.pots[0];
  const totalPot2 = pot2?.amount || potAwarded;

  if (opponentHoleCards) {
    const opponentPlayer = ohh.players.find(p => p.seat - 1 !== heroSeatIndex);
    if (opponentPlayer) {
      lines.push({ 
        type: 'result', 
        text: `${opponentPlayer.name} shows`, 
        cards: opponentHoleCards 
      });
    }
  }

  // Handle split pot
  if (isSplit && splitWinners && splitWinners.length > 1) {
    const cleanHandRank = winnerHandRank?.replace(' (split)', '') || '';
    lines.push({ type: 'result', text: `Split pot! Both players have ${cleanHandRank}` });
    
    // Use the OHH pot data for player names since it has the correct player IDs
    const potWinners = pot2?.player_wins || [];
    for (const potWinner of potWinners) {
      const winnerPlayer = ohh.players.find(p => p.id === potWinner.player_id);
      const isHero = winnerPlayer ? winnerPlayer.seat - 1 === heroSeatIndex : false;
      const name = isHero ? 'Hero' : (winnerPlayer?.name || 'Unknown');
      lines.push({ type: 'result', text: `  ${name} wins ${potWinner.win_amount} sec`, highlight: isHero });
    }
  } else {
    const winnerPlayerId2 = pot2?.player_wins?.[0]?.player_id;
    const winnerPlayer2 = winnerPlayerId2 !== undefined
      ? ohh.players.find(p => p.id === winnerPlayerId2)
      : undefined;
    
    const winnerIsHero2 = winnerPlayer2 ? winnerPlayer2.seat - 1 === heroSeatIndex : false;
    const winnerName2 = winnerIsHero2 ? 'Hero' : (winnerPlayer2?.name || 'Unknown');

    if (winnerHandRank) {
      lines.push({ type: 'result', text: `${winnerName2} wins ${potAwarded} sec with ${winnerHandRank}`, highlight: winnerIsHero2 });
    } else {
      lines.push({ type: 'result', text: `${winnerName2} wins ${potAwarded} sec`, highlight: winnerIsHero2 });
    }
  }
  
  lines.push({ type: 'result', text: `Pot: ${totalPot2} sec` });
  lines.push({ type: 'empty', text: '' });
  lines.push({ type: 'divider', text: '═══════════════════════════════════════════════════' });

  return lines;
}
