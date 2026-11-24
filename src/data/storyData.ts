export interface StoryQuest {
  id: string;
  title: string;
  description: string;
  rewardGold: number;
  rewardGp: number;
  unlocksNoark?: boolean;
  requirementText: string;
}

export interface CommunityPost {
  id: string;
  author: string;
  title: string;
  content: string;
}

export interface CommunityOffer {
  id: string;
  title: string;
  description: string;
  gpCost: number;
  suspicionIncrease: number;
}

export const STORY_QUESTS: StoryQuest[] = [
  {
    id: 'quest_crystal_survivor',
    title: 'บททดสอบแรกในถ้ำคริสตัล',
    description: 'เอาชีวิตรอดในเขาวงกตชั้นที่ 1 และกำจัดมอนสเตอร์อย่างน้อย 3 ชนิด',
    requirementText: 'กำจัดมอนสเตอร์ต่างชนิด ≥ 3 ชนิด',
    rewardGold: 60,
    rewardGp: 200,
  },
  {
    id: 'quest_goblin_forest',
    title: 'เส้นทางสู่ชั้นที่ 2 & เมืองโนอาร์ค',
    description: 'ค้นพบทางลงสู่ป่าก็อบลินชั้นที่ 2 เพื่อเปิดเส้นทางลับสู่เมืองใต้ดินโนอาร์ค',
    requirementText: 'ปลดล็อกเขาวงกตชั้นที่ 2',
    rewardGold: 100,
    rewardGp: 300,
    unlocksNoark: true,
  },
  {
    id: 'quest_rift_clear',
    title: 'ผู้พิชิตรอยแยก (Rift Challenger)',
    description: 'ท้าทายรอยแยก (◎) และปราบผู้พิทักษ์รอยแยก (แวมไพร์ / ไลแคนโทรป / แคนนิบาโล)',
    requirementText: 'ปราบผู้พิทักษ์รอยแยก 1 ตน',
    rewardGold: 150,
    rewardGp: 500,
  },
  {
    id: 'quest_doppel_forest',
    title: 'ป่าดอปเปลแกงเกอร์ (ชั้นที่ 4)',
    description: 'ก้าวเข้าสู่เขาวงกตชั้นที่ 4 ซึ่งเป็นขีดจำกัดของนักสำรวจทั่วไป',
    requirementText: 'ปลดล็อกเขาวงกตชั้นที่ 4',
    rewardGold: 250,
    rewardGp: 700,
  },
  {
    id: 'quest_flameless_master',
    title: 'สยบวิญญาณไร้เปลวเพลิง (ชั้นที่ 5)',
    description: 'ปราบ Floor Master ชั้น 5 [วิญญาณไร้เปลวเพลิง] ลงให้ได้',
    requirementText: 'ปราบ [วิญญาณไร้เปลวเพลิง]',
    rewardGold: 500,
    rewardGp: 1200,
  },
];

export const COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'post_1',
    author: 'GhostHunter_KR',
    title: '[คำเตือน] อย่าพูดคำว่า "เกม" หรือ "เลเวล" ต่อหน้าคนพื้นเมือง',
    content:
      'นักล่าวิญญาณร้ายในลาฟโดเนียกำลังจับตาดูสีหน้าและคำพูด ถ้าค่าความสงสัยสูงเกิน 60 พวกมันจะมาดักสอบสวน แต่ถ้าลงไปโนอาร์คพวกนั้นจะไม่ฆ่าวิญญาณร้าย',
  },
  {
    id: 'post_2',
    author: 'ElfNuna99',
    title: 'เคล็ดลับ: รอยแยก & แคนนิบาโล',
    content:
      'อัตราดรอปแก่นแท้ในรอยแยก (◎) สูงกว่าข้างนอกมาก! แต่ระวังอย่าแช่อยู่ในชั้นเดิมนานเกินไป ไม่งั้น "แคนนิบาโล" (Rank 7) จะโผล่ออกมาล่าคุณ',
  },
  {
    id: 'post_3',
    author: 'MuradFan',
    title: 'นัมเบอร์ไอเทม (Number Items) ของดีที่โนอาร์ค',
    content:
      'ที่ตลาดมืดโนอาร์คมีของอย่าง "กรงเล็บอเวจีหมายเลข 35" และ "ยาลบความจำ" ขายโดยไม่โดนพ่อค้าโก่งราคาด้วยนะ',
  },
  {
    id: 'post_4',
    author: 'LittleBalkan',
    title: 'ทำไมบาร์บาเรียนควรลองบิลด์ค้อนมือเดียว + โล่?',
    content:
      'คนเถื่อนปกติบ้าพลังฟาดอย่างเดียวจนตายง่าย แต่ถ้าถือโล่ลาเอเทียมคู่กับค้อนมือเดียวและมี Giantization จะยืนแทงก์ให้ปาร์ตี้สบายเลย',
  },
  {
    id: 'post_5',
    author: 'DwarfCraft',
    title: 'ข้อห้ามของเผ่าบาร์บาเรียนเรื่องวิหาร',
    content:
      'วิหารสามารถช่วยถอดแก่นแท้ที่พลาดดูดซับมาได้ (100G) และช่วยล้างคำสาปก่อนครบ 15 คำสาป แต่อย่าปล่อยให้โดนวิญญาณคำสาปกลืนกินล่ะ',
  },
  {
    id: 'post_6',
    author: 'Rank3Hunter',
    title: 'ความจริงเกี่ยวกับแก่นแท้ระดับ 3 ขึ้นไป',
    content:
      'ตั้งแต่ระดับ 3 ขึ้นไป มอนสเตอร์จะเริ่มมีแก่นแท้หลายสี (เช่น แดง ฟ้า ม่วง) และสกิลใช้งานที่ทรงพลังมาก อย่างโอเกอร์ที่ให้ [ผิวหนังเหล็กกล้า]',
  },
  {
    id: 'post_7',
    author: 'NoarkInsider',
    title: 'ข่าวลือเรื่อง "เศษเสี้ยวแห่งบันทึก" ของลอร์ดโนอาร์ค',
    content:
      'ว่ากันว่าลอร์ดแห่งโนอาร์คเก็บสมบัติย้อนเวลาของจอมเวทกาฟริลิอุสไว้ในเมืองใต้ดิน แต่แม้แต่ตัวลอร์ดเองก็ยังใช้ไม่เป็น',
  },
];

export const COMMUNITY_OFFERS: CommunityOffer[] = [
  {
    id: 'offer_gold_exchange',
    title: 'แลกเปลี่ยนเงินทุนลับ (+120 Gold)',
    description: 'แลก 250 GP เป็นเงินทุน 120 Gold ผ่านนายหน้าลึกลับ',
    gpCost: 250,
    suspicionIncrease: 15,
  },
  {
    id: 'offer_vial_pack',
    title: 'ชุดหลอดทดลองเก็บแก่นแท้ (Essence Vial x3)',
    description: 'ใช้ 200 GP สั่งซื้อหลอดทดลองราคาพิเศษ 3 หลอด',
    gpCost: 200,
    suspicionIncrease: 15,
  },
  {
    id: 'offer_ship_pass',
    title: 'ใบอนุญาตเดินเรือเถื่อน (ปลดล็อกชั้น 6)',
    description: 'ใช้ 450 GP รับใบอนุญาตเดินเรือข้ามมหาสมุทรชั้น 6 ทันที',
    gpCost: 450,
    suspicionIncrease: 20,
  },
  {
    id: 'offer_clear_suspicion',
    title: 'ลบร่องรอยคอมมูนิตี้ (-35 ความสงสัย)',
    description: 'ใช้ 180 GP จ้างแฮกเกอร์/นายหน้าลบหลักฐานวิญญาณร้าย',
    gpCost: 180,
    suspicionIncrease: -35,
  },
];
