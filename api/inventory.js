import inventoryRoutes from '../server/routes/inventory.js';

export default (req, res) => {
  return inventoryRoutes(req, res);
};
