/**
 * @module node.routes.js
 * @author iAmMichaelConnor
 * @desc merkle-tree.routes.js gives api endpoints to access the functions of the merkle-tree microservice
 */

import contractController from '../contract-controller';
import filterController from '../filter-controller';
import merkleTreeController from '../merkle-tree-controller';
import logger from '../logger';

const alreadyStarted = {}; // initialises as false
const alreadyStarting = {}; // initialises as false

/**
 * Updates the entire tree based on the latest-stored leaves.
 * req.user.db (an instance of mongoose.createConnection (a 'Connection' instance in mongoose terminoligy)) is required, to access the user's db from within the merkleTreeController
 * @param {*} req
 * @param {*} res - returns the tree's metadata
 */

// Pawel's note - Make the client (zapp in this case) send the contractName and contractAddress to this endpoint.
// Timber Client from Zapp's folder calls this.

async function startEventFilter(req, res, next) {
  logger.info('src/routes/merkle-tree.routes startEventFilter()');

  const { contractName, contractAddress } = req.body; // contractAddress & treeId are optional parameters. Address can instead be inferred by Timber in many cases.

  console.log(
    `merkle-tree-routes - I have received: contractName: ${contractName}, contractAddress: ${contractAddress}`,
  );

  // Pawel's note - From what I see Timber uses something called a "treeId" to identify the tree related to a given contract instance. Let's try making the treeId a concat of contractName, a "-" and contractAddress, so that we have a unique key to identify various trees.
  // But for some reason, it looks like something optional. But in our use case we need it. Let's also not rename this variable because it will get too messy.

  console.log;

  // Pawel's TODO idea: Ignore the contractAddress above. We'll get the Contract ID from the header

  const contractid = req.headers.contractid;
  console.log(`Received startEventFilter for contract ID ${contractid}`);

  // Pawel's note - Let's also not get the treeId from the caller. I've removed it from line 27. We will compute it based on the received contract info.
  console.log('Computing treeId');
  const treeId = `${contractName}-${contractAddress}`;

  const { db } = req.user;

  // TODO: if possible, make this easier to read and follow. Fewer 'if' statements. Perhaps use 'switch' statements instead?

  // Pawel's note - The whole mapping in alreadyStarted and alreadyStarting will be gone if Timber crashes.
  // Let's thin this thing a bit. This logic considers options where treeId is given and where it isn't. In our case, we will always have the treeId.
  // Stop pushing (contractName, treeId). Now we will only identify instances by treeId - we always will have it.

  try {
    if (alreadyStarted[(contractName, treeId)]) {
      res.data = { message: `filter already started for ${contractName}.${treeId}` };
    }
    if (alreadyStarting[(contractName, treeId)]) {
      res.data = {
        message: `filter is already in the process of being started for ${contractName}.${treeId}`,
      };
    } else {
        alreadyStarting[(contractName, treeId)] = true;
        logger.info(`starting filter for ${contractName}.${treeId}`);

        console.log(`Actually, we are starting it for ${treeId}`)
        
      // get a web3 contractInstance we can work with:

      // Pawel's note - here we are splitting into 4 functions. Which one is a priority?
      const contractInstance = await contractController.instantiateContract(
        db,
        contractName,
        contractAddress,
      );

      // start an event filter on this contractInstance:
      const started = await filterController.start(db, contractName, contractInstance, treeId);

      if (treeId === undefined || treeId === '') {
        alreadyStarted[contractName] = started; // true/false
        alreadyStarting[contractName] = false;
      } else {
        alreadyStarted[(contractName, treeId)] = started; // true/false
        alreadyStarting[(contractName, treeId)] = false;
      }
      res.data = { message: 'filter started' };
    }
    next();
  } catch (err) {
    alreadyStarting[contractName] = false;
    next(err);
  }
}

// Pawel's question - how does it know which tree to access?
/**
 * Get the siblingPath or 'witness path' for a given leaf.
 * req.user.db (an instance of mongoose.createConnection (a 'Connection' instance in mongoose terminoligy)) is required, to access the user's db from within the merkleTreeController
 * req.params {
 *  leafIndex: 1234,
 * }
 * @param {*} req
 * @param {*} res
 */
async function getSiblingPathByLeafIndex(req, res, next) {
  logger.info('src/routes/merkle-tree.routes getSiblingPathByLeafIndex()');
  logger.silly(`req.params: ${JSON.stringify(req.params, null, 2)}`);

  const { db } = req.user;
  let { leafIndex } = req.params;
  leafIndex = Number(leafIndex); // force to number

  try {
    // first update all nodes in the DB to be in line with the latest-known leaf:
    await merkleTreeController.update(db);

    // get the sibling path:
    const siblingPath = await merkleTreeController.getSiblingPathByLeafIndex(db, leafIndex);

    res.data = siblingPath;
    next();
  } catch (err) {
    next(err);
  }
}

// Pawel's question - how does it know which tree to access?

/**
 * Get the path for a given leaf.
 * req.user.db (an instance of mongoose.createConnection (a 'Connection' instance in mongoose terminoligy)) is required, to access the user's db from within the merkleTreeController
 * req.params {
 *  leafIndex: 1234,
 * }
 * @param {*} req
 * @param {*} res
 */
async function getPathByLeafIndex(req, res, next) {
  logger.info('src/routes/merkle-tree.routes getPathByLeafIndex()');
  logger.silly(`req.params: ${JSON.stringify(req.params, null, 2)}`);

  const { db } = req.user;
  let { leafIndex } = req.params;
  leafIndex = Number(leafIndex); // force to number

  try {
    // first update all nodes in the DB to be in line with the latest-known leaf:
    await merkleTreeController.update(db);

    // get the path:
    const path = await merkleTreeController.getPathByLeafIndex(db, leafIndex);

    res.data = path;
    next();
  } catch (err) {
    next(err);
  }
}

// Pawel's question - how does it know which tree to access?
/**
 * Updates the entire tree based on the latest-stored leaves.
 * req.user.db (an instance of mongoose.createConnection (a 'Connection' instance in mongoose terminoligy)) is required, to access the user's db from within the merkleTreeController
 * @param {*} req
 * @param {*} res - returns the tree's metadata
 */
async function update(req, res, next) {
  logger.info('src/routes/merkle-tree.routes update()');

  const { db } = req.user;

  try {
    const metadata = await merkleTreeController.update(db);

    res.data = metadata;
    next();
  } catch (err) {
    next(err);
  }
}

// initializing routes
export default function(router) {
  router.route('/start').post(startEventFilter);

  router.route('/update').patch(update);

  router.get('/siblingPath/:leafIndex', getSiblingPathByLeafIndex);
  router.get('/path/:leafIndex', getPathByLeafIndex);
}
