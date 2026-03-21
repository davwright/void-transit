import SaveManager from '../src/engine/SaveManager';
const sm = new SaveManager();
const result = sm.load('quicksave');
process.stdout.write('success: ' + result.success + '\n');
if (result.success && result.state) {
  process.stdout.write('room: ' + result.state.currentRoom + '\n');
  process.stdout.write('turn: ' + result.state.turnCount + '\n');
  process.stdout.write('health: ' + result.state.playerHealth + '\n');
  process.stdout.write('visited: ' + result.state.visitedRooms.size + ' rooms\n');
  process.stdout.write('inventory: ' + result.state.inventory.length + ' items\n');
} else {
  process.stdout.write('reason: ' + (result as any).reason + '\n');
}
