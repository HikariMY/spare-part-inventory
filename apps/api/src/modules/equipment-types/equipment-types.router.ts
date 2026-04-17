import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { prisma } from '../../lib/prisma.js';
import { createEquipmentTypeSchema, updateEquipmentTypeSchema } from '@spare-part/shared';

export const equipmentTypesRouter: IRouter = Router();

equipmentTypesRouter.use(requireAuth);

// GET /api/equipment-types
equipmentTypesRouter.get('/', async (_req, res, next) => {
  try {
    const types = await prisma.equipmentType.findMany({ orderBy: { code: 'asc' } });
    res.json(types);
  } catch (err) {
    next(err);
  }
});

// GET /api/equipment-types/:id
equipmentTypesRouter.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const type = await prisma.equipmentType.findUnique({ where: { id } });
    if (!type) throw new AppError(404, 'NOT_FOUND', 'Equipment type not found');
    res.json(type);
  } catch (err) {
    next(err);
  }
});

// POST /api/equipment-types — ADMIN, MANAGER
equipmentTypesRouter.post('/', requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const parsed = createEquipmentTypeSchema.safeParse(req.body);
    if (!parsed.success)
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', parsed.error.issues);

    const exists = await prisma.equipmentType.findUnique({ where: { code: parsed.data.code } });
    if (exists) throw new AppError(409, 'CONFLICT', `Code "${parsed.data.code}" already exists`);

    const type = await prisma.equipmentType.create({ data: parsed.data });
    res.status(201).json(type);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/equipment-types/:id — ADMIN, MANAGER
equipmentTypesRouter.patch('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const parsed = updateEquipmentTypeSchema.safeParse(req.body);
    if (!parsed.success)
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', parsed.error.issues);

    const type = await prisma.equipmentType.findUnique({ where: { id } });
    if (!type) throw new AppError(404, 'NOT_FOUND', 'Equipment type not found');

    if (parsed.data.code && parsed.data.code !== type.code) {
      const exists = await prisma.equipmentType.findUnique({ where: { code: parsed.data.code } });
      if (exists) throw new AppError(409, 'CONFLICT', `Code "${parsed.data.code}" already exists`);
    }

    const updated = await prisma.equipmentType.update({ where: { id }, data: parsed.data });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/equipment-types/:id — ADMIN only
equipmentTypesRouter.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const type = await prisma.equipmentType.findUnique({ where: { id } });
    if (!type) throw new AppError(404, 'NOT_FOUND', 'Equipment type not found');

    const inUse = await prisma.sparePart.count({ where: { equipmentTypeId: id } });
    if (inUse > 0)
      throw new AppError(409, 'CONFLICT', `Cannot delete — ${inUse} spare part(s) use this type`);

    await prisma.equipmentType.delete({ where: { id } });
    res.json({ message: 'Equipment type deleted' });
  } catch (err) {
    next(err);
  }
});
