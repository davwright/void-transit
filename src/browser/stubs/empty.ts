// Stub for Node modules not available in browser
export default {};
export const readFileSync = () => { throw new Error('fs not available in browser'); };
export const writeFileSync = () => {};
export const existsSync = () => false;
export const mkdirSync = () => {};
export const readdirSync = () => [];
export const appendFileSync = () => {};
export const unlinkSync = () => {};
export const cpSync = () => {};
export const execSync = () => { throw new Error('child_process not available in browser'); };
