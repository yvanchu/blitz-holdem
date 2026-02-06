/**
 * Game Fixture for Playwright E2E Tests
 *
 * Provides a reusable test fixture for setting up poker games with two players
 * in separate browser contexts.
 */

import { test as base, type Browser, type BrowserContext, type Page } from '@playwright/test';

/**
 * Page Object Model for a player in the game
 */
export class PlayerPage {
  constructor(
    readonly page: Page,
    readonly playerNumber: 1 | 2
  ) {}

  // Selectors
  get communityCards() {
    return this.page.locator('[data-testid="community-cards"] [data-testid="card"]');
  }

  get holeCards() {
    return this.page.locator('[data-testid="hole-cards"] [data-testid="card"]');
  }

  get pot() {
    return this.page.locator('[data-testid="pot"]');
  }

  get potValue() {
    return this.page.locator('[data-testid="pot-value"]');
  }

  get yourSeat() {
    return this.page.locator('[data-testid="seat-bottom"]');
  }

  get opponentSeat() {
    return this.page.locator('[data-testid="seat-top"]');
  }

  get resultOverlay() {
    return this.page.locator('[data-testid="result-overlay"]');
  }

  get settingsButton() {
    return this.page.locator('[data-testid="settings-button"]');
  }

  get settingsModal() {
    return this.page.locator('[data-testid="settings-modal"]');
  }

  get settingsSaveButton() {
    return this.page.locator('[data-testid="settings-save-button"]');
  }

  get readyButton() {
    return this.page.locator('[data-testid="ready-button"]');
  }

  get startButton() {
    return this.page.locator('[data-testid="start-game-button"]');
  }

  get copyLinkButton() {
    return this.page.locator('[data-testid="copy-link-button"]');
  }

  // Action bar buttons
  get actionBar() {
    return this.page.locator('[data-testid="action-bar"]');
  }

  get foldButton() {
    return this.page.locator('[data-testid="fold-button"]');
  }

  get checkButton() {
    return this.page.locator('[data-testid="check-button"]');
  }

  get callButton() {
    return this.page.locator('[data-testid="call-button"]');
  }

  get raiseButton() {
    return this.page.locator('[data-testid="raise-button"]');
  }

  get betSlider() {
    return this.page.locator('[data-testid="bet-slider"]');
  }

  get betInput() {
    return this.page.locator('[data-testid="bet-input"]');
  }

  get confirmRaiseButton() {
    return this.page.locator('[data-testid="confirm-raise-button"]');
  }

  get showCardsButton() {
    return this.page.locator('[data-testid="show-cards-button"]');
  }

  // Timer
  get timer() {
    return this.page.locator('[data-testid="timer"]');
  }

  get activeTimer() {
    return this.page.locator('[data-testid="timer"][data-timer-active="true"]');
  }

  // Actions
  async waitForTurn(timeout = 10000): Promise<void> {
    // Wait for any action button to be enabled (not disabled)
    await this.page.waitForFunction(
      () => {
        const fold = document.querySelector('[data-testid="fold-button"]') as HTMLButtonElement;
        const check = document.querySelector('[data-testid="check-button"]') as HTMLButtonElement;
        const call = document.querySelector('[data-testid="call-button"]') as HTMLButtonElement;
        return (fold && !fold.disabled) || (check && !check.disabled) || (call && !call.disabled);
      },
      { timeout }
    );
  }

  async waitForNotTurn(timeout = 10000): Promise<void> {
    // Wait until all action buttons are disabled
    await this.page.waitForFunction(
      () => {
        const fold = document.querySelector('[data-testid="fold-button"]') as HTMLButtonElement;
        const check = document.querySelector('[data-testid="check-button"]') as HTMLButtonElement;
        const call = document.querySelector('[data-testid="call-button"]') as HTMLButtonElement;
        return fold?.disabled && check?.disabled && call?.disabled;
      },
      { timeout }
    );
  }

  async isMyTurn(): Promise<boolean> {
    const fold = this.foldButton;
    const check = this.checkButton;
    const call = this.callButton;
    
    const foldDisabled = await fold.isDisabled();
    const checkDisabled = await check.isDisabled();
    const callDisabled = await call.isDisabled();
    
    return !foldDisabled || !checkDisabled || !callDisabled;
  }

  async fold(): Promise<void> {
    await this.foldButton.click();
  }

  async check(): Promise<void> {
    await this.checkButton.click();
  }

  async call(): Promise<void> {
    await this.callButton.click();
  }

  async raise(amount?: number): Promise<void> {
    await this.raiseButton.click();
    if (amount !== undefined) {
      await this.betInput.fill(String(amount));
    }
    await this.confirmRaiseButton.click();
  }

  async allIn(): Promise<void> {
    // Open raise panel and use the All In preset
    await this.raiseButton.click();
    await this.page.locator('button:has-text("All In")').click();
    await this.confirmRaiseButton.click();
  }

  async showCards(): Promise<void> {
    await this.showCardsButton.click();
  }

  async ready(): Promise<void> {
    await this.readyButton.click();
  }

  async startGame(): Promise<void> {
    await this.startButton.click();
  }
}

/**
 * Test fixture type definitions
 */
interface GameFixture {
  player1: PlayerPage;
  player2: PlayerPage;
  player1Context: BrowserContext;
  player2Context: BrowserContext;
  roomId: string;
}

/**
 * Create and join a game room with two players
 */
async function createGame(browser: Browser, baseURL: string): Promise<GameFixture> {
  // Create two separate browser contexts (like two different users)
  const player1Context = await browser.newContext();
  const player2Context = await browser.newContext();

  const page1 = await player1Context.newPage();
  const page2 = await player2Context.newPage();

  const player1 = new PlayerPage(page1, 1);
  const player2 = new PlayerPage(page2, 2);

  // Player 1 creates the room
  await page1.goto(baseURL);
  await page1.fill('#alias', 'Player1');
  await page1.click('button:has-text("Create Table")');

  // Wait for navigation to table page
  await page1.waitForURL(/\/table\/.+/);
  const roomId = page1.url().split('/table/')[1];

  // Player 2 joins using the same room ID
  await page2.goto(`${baseURL}/table/${roomId}`);

  // Wait for both players to see the table
  await page1.waitForSelector('[data-testid="poker-table"]', { timeout: 10000 });
  await page2.waitForSelector('[data-testid="poker-table"]', { timeout: 10000 });

  return {
    player1,
    player2,
    player1Context,
    player2Context,
    roomId,
  };
}

/**
 * Extended Playwright test with game fixture
 */
export const test = base.extend<{ game: GameFixture }>({
  game: async ({ browser }, use) => {
    const baseURL = 'http://localhost:5173';
    const game = await createGame(browser, baseURL);

    await use(game);

    // Cleanup
    await game.player1Context.close();
    await game.player2Context.close();
  },
});

export { expect } from '@playwright/test';

/**
 * Helper to start a game with both players ready
 */
export async function startGameWithBothReady(game: GameFixture): Promise<void> {
  await game.player2.ready();
  await game.player1.startGame();

  // Wait for game to start (hole cards dealt)
  await game.player1.page.waitForSelector('[data-testid="hole-cards"] [data-testid="card"]', {
    timeout: 10000,
  });
  await game.player2.page.waitForSelector('[data-testid="hole-cards"] [data-testid="card"]', {
    timeout: 10000,
  });
}

/**
 * Helper to complete preflop betting with call-check
 */
export async function completePreflop(game: GameFixture): Promise<void> {
  // Determine who acts first (dealer/SB acts first preflop in heads-up)
  try {
    await game.player1.waitForTurn(2000);
    await game.player1.call();
    await game.player2.waitForTurn();
    await game.player2.check();
  } catch {
    // Player 2 acts first
    await game.player2.call();
    await game.player1.waitForTurn();
    await game.player1.check();
  }
}

/**
 * Helper to check-check through a street
 */
export async function checkCheckStreet(game: GameFixture): Promise<void> {
  // Determine who acts first (out of position acts first postflop)
  try {
    await game.player1.waitForTurn(2000);
    await game.player1.check();
    await game.player2.waitForTurn();
    await game.player2.check();
  } catch {
    await game.player2.check();
    await game.player1.waitForTurn();
    await game.player1.check();
  }
}
