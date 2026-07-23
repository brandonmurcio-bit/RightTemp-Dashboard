import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leadsRouter from "./leads";
import customersRouter from "./customers";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(leadsRouter);
router.use(customersRouter);
router.use(dashboardRouter);

export default router;
