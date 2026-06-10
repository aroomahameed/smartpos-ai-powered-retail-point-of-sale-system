import { Request, Response } from 'express';
import Coupon, { CouponDiscountType } from './coupon.model';

const DEFAULT_COUPON = {
  code: 'EID10',
  discountType: 'percentage' as CouponDiscountType,
  discountValue: 10,
  expiresAt: new Date('2026-06-30T23:59:59.999+05:00'),
  minimumPurchaseAmount: 500,
  isActive: true,
};

const ensureDefaultCoupon = async (): Promise<void> => {
  const exists = await Coupon.exists({ code: DEFAULT_COUPON.code });
  if (!exists) {
    await Coupon.create(DEFAULT_COUPON);
  }
};

const calculateCouponDiscount = (
  discountType: CouponDiscountType,
  discountValue: number,
  subtotal: number
): number => {
  if (discountType === 'percentage') {
    return subtotal * (discountValue / 100);
  }

  return discountValue;
};

export const validateCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureDefaultCoupon();

    const code = String(req.body.code || '').trim().toUpperCase();
    const subtotal = Number(req.body.subtotal || 0);

    if (!code) {
      res.status(400).json({ message: 'Coupon code is required' });
      return;
    }

    const coupon = await Coupon.findOne({ code });
    if (!coupon || !coupon.isActive) {
      res.status(404).json({ message: 'Coupon code is not valid' });
      return;
    }

    if (coupon.expiresAt.getTime() < Date.now()) {
      res.status(400).json({ message: 'Coupon has expired' });
      return;
    }

    if (subtotal < coupon.minimumPurchaseAmount) {
      res.status(400).json({
        message: `Minimum bill is ${coupon.minimumPurchaseAmount}`,
        minimumPurchaseAmount: coupon.minimumPurchaseAmount,
      });
      return;
    }

    const discountAmount = Math.min(
      calculateCouponDiscount(coupon.discountType, coupon.discountValue, subtotal),
      subtotal
    );

    res.status(200).json({
      coupon,
      discountAmount,
      message: 'Coupon applied',
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const createCoupon = async (req: any, res: Response): Promise<void> => {
  try {
    const {
      code,
      discountType,
      discountValue,
      expiresAt,
      minimumPurchaseAmount,
      isActive,
    } = req.body;

    const coupon = await Coupon.create({
      code,
      discountType,
      discountValue,
      expiresAt,
      minimumPurchaseAmount,
      isActive,
    });

    res.status(201).json({
      message: 'Coupon created',
      coupon,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
