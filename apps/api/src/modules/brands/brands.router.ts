import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { prisma } from '../../lib/prisma.js';
import { createBrandSchema, updateBrandSchema } from '@spare-part/shared';

export const brandsRouter: IRouter = Router();

brandsRouter.use(requireAuth);

// GET /api/brands
brandsRouter.get('/', async (_req, res, next) => {
  try {
    const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } });
    res.json(brands);
  } catch (err) {
    next(err);
  }
});

// GET /api/brands/:id
brandsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new AppError(404, 'NOT_FOUND', 'Brand not found');
    res.json(brand);
  } catch (err) {
    next(err);
  }
});

// POST /api/brands — ADMIN, MANAGER
brandsRouter.post('/', requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const parsed = createBrandSchema.safeParse(req.body);
    if (!parsed.success)
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', parsed.error.issues);

    const exists = await prisma.brand.findUnique({ where: { name: parsed.data.name } });
    if (exists) throw new AppError(409, 'CONFLICT', `Brand "${parsed.data.name}" already exists`);

    const brand = await prisma.brand.create({ data: parsed.data });
    res.status(201).json(brand);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/brands/:id — ADMIN, MANAGER
brandsRouter.patch('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const parsed = updateBrandSchema.safeParse(req.body);
    if (!parsed.success)
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', parsed.error.issues);

    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new AppError(404, 'NOT_FOUND', 'Brand not found');

    if (parsed.data.name && parsed.data.name !== brand.name) {
      const exists = await prisma.brand.findUnique({ where: { name: parsed.data.name } });
      if (exists) throw new AppError(409, 'CONFLICT', `Brand "${parsed.data.name}" already exists`);
    }

    const updated = await prisma.brand.update({ where: { id }, data: parsed.data });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/brands/:id — ADMIN only
brandsRouter.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new AppError(404, 'NOT_FOUND', 'Brand not found');

    const inUse = await prisma.sparePart.count({ where: { brandId: id } });
    if (inUse > 0)
      throw new AppError(409, 'CONFLICT', `Cannot delete — ${inUse} spare part(s) use this brand`);

    await prisma.brand.delete({ where: { id } });
    res.json({ message: 'Brand deleted' });
  } catch (err) {
    next(err);
  }
});
