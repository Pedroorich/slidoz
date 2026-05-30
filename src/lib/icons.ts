import {
  Check, Star, Zap, ArrowRight, Circle, CheckCircle, Info, Lightbulb,
  Target, TrendingUp, Award, Shield, Heart, ThumbsUp, Clock, Calendar,
  User, Settings, PenTool, Rocket, Sparkles, Play, Search, MessageCircle,
  CheckSquare, X, AlertCircle, CheckCircle2, ChevronRight
} from 'lucide-react';

export const AVAILABLE_ICONS: Record<string, any> = {
  Check, Star, Zap, ArrowRight, Circle, CheckCircle, Info, Lightbulb,
  Target, TrendingUp, Award, Shield, Heart, ThumbsUp, Clock, Calendar,
  User, Settings, PenTool, Rocket, Sparkles, Play, Search, MessageCircle,
  CheckSquare, X, AlertCircle, CheckCircle2, ChevronRight
};

export type IconName = keyof typeof AVAILABLE_ICONS;
